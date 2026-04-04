package wallet

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

var (
	ErrInvalidMutationRequest = errors.New("invalid wallet mutation request")
	ErrInsufficientFunds      = errors.New("insufficient funds")
	ErrIdempotencyConflict    = errors.New("idempotency key replay payload conflict")
	ErrCorrectionTaskNotFound = errors.New("wallet correction task not found")
)

const walletDBTimeout = 5 * time.Second

type MutationRequest struct {
	UserID         string
	AmountCents    int64
	IdempotencyKey string
	Reason         string
}

type LedgerEntry struct {
	EntryID         string `json:"entryId"`
	UserID          string `json:"userId"`
	Type            string `json:"type"`
	AmountCents     int64  `json:"amountCents"`
	BalanceCents    int64  `json:"balanceCents"`
	IdempotencyKey  string `json:"idempotencyKey"`
	Reason          string `json:"reason,omitempty"`
	TransactionTime string `json:"transactionTime"`
}

type ReconciliationSummary struct {
	From            string `json:"from,omitempty"`
	To              string `json:"to,omitempty"`
	TotalCredits    int64  `json:"totalCreditsCents"`
	TotalDebits     int64  `json:"totalDebitsCents"`
	NetMovement     int64  `json:"netMovementCents"`
	EntryCount      int64  `json:"entryCount"`
	DistinctUserIDs int64  `json:"distinctUserCount"`
}

type CorrectionTask struct {
	TaskID                    string `json:"taskId"`
	UserID                    string `json:"userId"`
	Type                      string `json:"type"`
	Status                    string `json:"status"`
	CurrentBalanceCents       int64  `json:"currentBalanceCents"`
	SuggestedAdjustmentCents  int64  `json:"suggestedAdjustmentCents"`
	Reason                    string `json:"reason"`
	Details                   string `json:"details,omitempty"`
	CreatedAt                 string `json:"createdAt"`
	UpdatedAt                 string `json:"updatedAt"`
	ResolvedAt                string `json:"resolvedAt,omitempty"`
	ResolvedBy                string `json:"resolvedBy,omitempty"`
	ResolutionNote            string `json:"resolutionNote,omitempty"`
	AutomationSource          string `json:"automationSource,omitempty"`
	RelatedReconciliationFrom string `json:"relatedReconciliationFrom,omitempty"`
	RelatedReconciliationTo   string `json:"relatedReconciliationTo,omitempty"`
}

type persistedWalletState struct {
	Balances        map[string]int64          `json:"balances"`
	Ledger          map[string][]LedgerEntry  `json:"ledger"`
	IdempotencyMap  map[string]LedgerEntry    `json:"idempotencyMap"`
	Sequence        int64                     `json:"sequence"`
	CorrectionTasks map[string]CorrectionTask `json:"correctionTasks"`
	CorrectionSeq   int64                     `json:"correctionSeq"`
}

type Service struct {
	mu sync.RWMutex

	balances        map[string]int64
	ledger          map[string][]LedgerEntry
	idempotencyMap  map[string]LedgerEntry
	sequence        int64
	correctionSeq   int64
	correctionTasks map[string]CorrectionTask
	now             func() time.Time
	statePath       string

	db *sql.DB
}

func NewService() *Service {
	return NewServiceWithPath("")
}

func NewServiceFromEnv() *Service {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("WALLET_STORE_MODE")))
	if mode == "db" || mode == "sql" || mode == "postgres" {
		driver := strings.TrimSpace(os.Getenv("WALLET_DB_DRIVER"))
		if driver == "" {
			driver = "postgres"
		}
		dsn := strings.TrimSpace(os.Getenv("WALLET_DB_DSN"))
		if dsn == "" {
			log.Printf("warning: WALLET_STORE_MODE=%s requested, but WALLET_DB_DSN is empty; falling back to local wallet store", mode)
		} else {
			svc, err := NewServiceWithDB(driver, dsn)
			if err != nil {
				log.Printf("warning: failed to initialize wallet db store driver=%s: %v; falling back to local wallet store", driver, err)
			} else {
				log.Printf("wallet service initialized in db mode using driver=%s", driver)
				return svc
			}
		}
	}

	return NewServiceWithPath(os.Getenv("WALLET_LEDGER_FILE"))
}

func NewServiceWithDB(driver string, dsn string) (*Service, error) {
	if strings.TrimSpace(driver) == "" {
		driver = "postgres"
	}
	if strings.TrimSpace(dsn) == "" {
		return nil, fmt.Errorf("empty wallet dsn")
	}

	db, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), walletDBTimeout)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}

	svc := &Service{db: db, now: time.Now}
	if err := svc.ensureSchema(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return svc, nil
}

func NewServiceWithPath(statePath string) *Service {
	svc := &Service{
		balances:        map[string]int64{},
		ledger:          map[string][]LedgerEntry{},
		idempotencyMap:  map[string]LedgerEntry{},
		correctionTasks: map[string]CorrectionTask{},
		now:             time.Now,
		statePath:       statePath,
	}
	if statePath != "" {
		_ = svc.loadFromDisk()
	}
	return svc
}

func (s *Service) Credit(request MutationRequest) (LedgerEntry, error) {
	if s.db != nil {
		return s.applyMutationDB("credit", request)
	}
	return s.applyMutationMemory("credit", request)
}

func (s *Service) Debit(request MutationRequest) (LedgerEntry, error) {
	if s.db != nil {
		return s.applyMutationDB("debit", request)
	}
	return s.applyMutationMemory("debit", request)
}

func (s *Service) Balance(userID string) int64 {
	if s.db != nil {
		ctx, cancel := context.WithTimeout(context.Background(), walletDBTimeout)
		defer cancel()
		var balance int64
		err := s.db.QueryRowContext(ctx, "SELECT balance_cents FROM wallet_balances WHERE user_id = $1", userID).Scan(&balance)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return 0
			}
			return 0
		}
		return balance
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.balances[userID]
}

func (s *Service) Ledger(userID string, limit int) []LedgerEntry {
	if s.db != nil {
		return s.ledgerFromDB(userID, limit)
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	entries := s.ledger[userID]
	if limit <= 0 || limit >= len(entries) {
		out := make([]LedgerEntry, len(entries))
		copy(out, entries)
		return out
	}

	start := len(entries) - limit
	if start < 0 {
		start = 0
	}

	out := make([]LedgerEntry, len(entries[start:]))
	copy(out, entries[start:])
	return out
}

func (s *Service) ReconciliationSummary(from *time.Time, to *time.Time) (ReconciliationSummary, error) {
	if s.db != nil {
		return s.reconciliationSummaryFromDB(from, to)
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	summary := ReconciliationSummary{}
	if from != nil {
		summary.From = from.UTC().Format(time.RFC3339)
	}
	if to != nil {
		summary.To = to.UTC().Format(time.RFC3339)
	}

	seenUsers := map[string]struct{}{}
	for userID, entries := range s.ledger {
		for _, entry := range entries {
			entryTime, ok := parseEntryTime(entry.TransactionTime)
			if !ok {
				continue
			}
			if from != nil && entryTime.Before(from.UTC()) {
				continue
			}
			if to != nil && entryTime.After(to.UTC()) {
				continue
			}

			if entry.Type == "credit" {
				summary.TotalCredits += entry.AmountCents
			}
			if entry.Type == "debit" {
				summary.TotalDebits += entry.AmountCents
			}
			summary.EntryCount++
			seenUsers[userID] = struct{}{}
		}
	}
	summary.NetMovement = summary.TotalCredits - summary.TotalDebits
	summary.DistinctUserIDs = int64(len(seenUsers))
	return summary, nil
}

func (s *Service) ScanCorrectionTasks() ([]CorrectionTask, error) {
	issues, err := s.collectCorrectionIssues()
	if err != nil {
		return nil, err
	}

	now := s.now().UTC().Format(time.RFC3339)

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, issue := range issues {
		existingID, existingTask, found := findOpenCorrectionTaskLocked(s.correctionTasks, issue.UserID, issue.Type)
		if found {
			existingTask.CurrentBalanceCents = issue.CurrentBalanceCents
			existingTask.SuggestedAdjustmentCents = issue.SuggestedAdjustmentCents
			existingTask.Reason = issue.Reason
			existingTask.Details = issue.Details
			existingTask.UpdatedAt = now
			existingTask.AutomationSource = issue.AutomationSource
			s.correctionTasks[existingID] = existingTask
			continue
		}

		s.correctionSeq++
		task := CorrectionTask{
			TaskID:                   fmt.Sprintf("ct:%d", s.correctionSeq),
			UserID:                   issue.UserID,
			Type:                     issue.Type,
			Status:                   "open",
			CurrentBalanceCents:      issue.CurrentBalanceCents,
			SuggestedAdjustmentCents: issue.SuggestedAdjustmentCents,
			Reason:                   issue.Reason,
			Details:                  issue.Details,
			CreatedAt:                now,
			UpdatedAt:                now,
			AutomationSource:         issue.AutomationSource,
		}
		s.correctionTasks[task.TaskID] = task
	}

	if err := s.persistLocked(); err != nil {
		return nil, err
	}
	return s.listCorrectionTasksLocked("", "", 200), nil
}

func (s *Service) ListCorrectionTasks(status string, userID string, limit int) []CorrectionTask {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.listCorrectionTasksLocked(status, userID, limit)
}

func (s *Service) CreateManualCorrectionTask(userID string, reason string, details string, suggestedAdjustmentCents int64) (CorrectionTask, error) {
	trimmedUserID := strings.TrimSpace(userID)
	trimmedReason := strings.TrimSpace(reason)
	if trimmedUserID == "" || trimmedReason == "" {
		return CorrectionTask{}, ErrInvalidMutationRequest
	}

	now := s.now().UTC().Format(time.RFC3339)
	currentBalance := s.Balance(trimmedUserID)

	s.mu.Lock()
	defer s.mu.Unlock()

	s.correctionSeq++
	task := CorrectionTask{
		TaskID:                   fmt.Sprintf("ct:%d", s.correctionSeq),
		UserID:                   trimmedUserID,
		Type:                     "manual_review",
		Status:                   "open",
		CurrentBalanceCents:      currentBalance,
		SuggestedAdjustmentCents: suggestedAdjustmentCents,
		Reason:                   trimmedReason,
		Details:                  strings.TrimSpace(details),
		CreatedAt:                now,
		UpdatedAt:                now,
		AutomationSource:         "manual",
	}
	s.correctionTasks[task.TaskID] = task

	if err := s.persistLocked(); err != nil {
		return CorrectionTask{}, err
	}
	return task, nil
}

func (s *Service) ResolveCorrectionTask(taskID string, actorID string, note string) (CorrectionTask, error) {
	trimmedTaskID := strings.TrimSpace(taskID)
	if trimmedTaskID == "" {
		return CorrectionTask{}, ErrCorrectionTaskNotFound
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	task, exists := s.correctionTasks[trimmedTaskID]
	if !exists {
		return CorrectionTask{}, ErrCorrectionTaskNotFound
	}

	now := s.now().UTC().Format(time.RFC3339)
	task.Status = "resolved"
	task.UpdatedAt = now
	task.ResolvedAt = now
	task.ResolvedBy = strings.TrimSpace(actorID)
	if task.ResolvedBy == "" {
		task.ResolvedBy = "admin"
	}
	task.ResolutionNote = strings.TrimSpace(note)
	s.correctionTasks[task.TaskID] = task

	if err := s.persistLocked(); err != nil {
		return CorrectionTask{}, err
	}
	return task, nil
}

func (s *Service) applyMutationMemory(kind string, request MutationRequest) (LedgerEntry, error) {
	if request.UserID == "" || request.AmountCents <= 0 || request.IdempotencyKey == "" {
		return LedgerEntry{}, ErrInvalidMutationRequest
	}

	idempotencyIndex := fmt.Sprintf("%s:%s:%s", kind, request.UserID, request.IdempotencyKey)

	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, found := s.idempotencyMap[idempotencyIndex]; found {
		if existing.AmountCents != request.AmountCents || strings.TrimSpace(existing.Reason) != strings.TrimSpace(request.Reason) {
			return LedgerEntry{}, ErrIdempotencyConflict
		}
		return existing, nil
	}

	balance := s.balances[request.UserID]
	if kind == "debit" && balance < request.AmountCents {
		return LedgerEntry{}, ErrInsufficientFunds
	}

	if kind == "credit" {
		balance += request.AmountCents
	} else {
		balance -= request.AmountCents
	}

	s.sequence++
	entry := LedgerEntry{
		EntryID:         fmt.Sprintf("le:%d", s.sequence),
		UserID:          request.UserID,
		Type:            kind,
		AmountCents:     request.AmountCents,
		BalanceCents:    balance,
		IdempotencyKey:  request.IdempotencyKey,
		Reason:          request.Reason,
		TransactionTime: s.now().UTC().Format(time.RFC3339),
	}

	s.balances[request.UserID] = balance
	s.ledger[request.UserID] = append(s.ledger[request.UserID], entry)
	s.idempotencyMap[idempotencyIndex] = entry

	if err := s.persistLocked(); err != nil {
		return LedgerEntry{}, err
	}

	return entry, nil
}

func (s *Service) applyMutationDB(kind string, request MutationRequest) (LedgerEntry, error) {
	if request.UserID == "" || request.AmountCents <= 0 || request.IdempotencyKey == "" {
		return LedgerEntry{}, ErrInvalidMutationRequest
	}

	ctx, cancel := context.WithTimeout(context.Background(), walletDBTimeout)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return LedgerEntry{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	existing, found, err := findExistingMutation(ctx, tx, kind, request.UserID, request.IdempotencyKey)
	if err != nil {
		return LedgerEntry{}, err
	}
	if found {
		if existing.AmountCents != request.AmountCents || strings.TrimSpace(existing.Reason) != strings.TrimSpace(request.Reason) {
			return LedgerEntry{}, ErrIdempotencyConflict
		}
		return existing, nil
	}

	if _, err := tx.ExecContext(ctx, `
INSERT INTO wallet_balances (user_id, balance_cents, updated_at)
VALUES ($1, 0, NOW())
ON CONFLICT (user_id) DO NOTHING`, request.UserID); err != nil {
		return LedgerEntry{}, err
	}

	var balance int64
	if err := tx.QueryRowContext(ctx, `
SELECT balance_cents
FROM wallet_balances
WHERE user_id = $1
FOR UPDATE`, request.UserID).Scan(&balance); err != nil {
		return LedgerEntry{}, err
	}

	if kind == "debit" && balance < request.AmountCents {
		return LedgerEntry{}, ErrInsufficientFunds
	}

	if kind == "credit" {
		balance += request.AmountCents
	} else {
		balance -= request.AmountCents
	}

	if _, err := tx.ExecContext(ctx, `
UPDATE wallet_balances
SET balance_cents = $2, updated_at = NOW()
WHERE user_id = $1`, request.UserID, balance); err != nil {
		return LedgerEntry{}, err
	}

	var (
		id              int64
		transactionTime string
	)
	err = tx.QueryRowContext(ctx, `
INSERT INTO wallet_ledger (user_id, entry_type, amount_cents, balance_cents, idempotency_key, reason, transaction_time)
VALUES ($1, $2, $3, $4, $5, $6, NOW())
RETURNING id, CAST(transaction_time AS TEXT)`,
		request.UserID,
		kind,
		request.AmountCents,
		balance,
		request.IdempotencyKey,
		normalizeReason(request.Reason),
	).Scan(&id, &transactionTime)
	if err != nil {
		return LedgerEntry{}, err
	}

	if err := tx.Commit(); err != nil {
		return LedgerEntry{}, err
	}

	return LedgerEntry{
		EntryID:         fmt.Sprintf("le:%d", id),
		UserID:          request.UserID,
		Type:            kind,
		AmountCents:     request.AmountCents,
		BalanceCents:    balance,
		IdempotencyKey:  request.IdempotencyKey,
		Reason:          request.Reason,
		TransactionTime: transactionTime,
	}, nil
}

func (s *Service) ledgerFromDB(userID string, limit int) []LedgerEntry {
	ctx, cancel := context.WithTimeout(context.Background(), walletDBTimeout)
	defer cancel()

	query := `
SELECT id, user_id, entry_type, amount_cents, balance_cents, idempotency_key, COALESCE(reason, ''), CAST(transaction_time AS TEXT)
FROM wallet_ledger
WHERE user_id = $1
ORDER BY id DESC`

	var (
		rows *sql.Rows
		err  error
	)
	if limit > 0 {
		rows, err = s.db.QueryContext(ctx, query+" LIMIT $2", userID, limit)
	} else {
		rows, err = s.db.QueryContext(ctx, query, userID)
	}
	if err != nil {
		return []LedgerEntry{}
	}
	defer rows.Close()

	descending := make([]LedgerEntry, 0, max(1, limit))
	for rows.Next() {
		var (
			id              int64
			entry           LedgerEntry
			transactionTime string
		)
		if err := rows.Scan(&id, &entry.UserID, &entry.Type, &entry.AmountCents, &entry.BalanceCents, &entry.IdempotencyKey, &entry.Reason, &transactionTime); err != nil {
			return []LedgerEntry{}
		}
		entry.EntryID = fmt.Sprintf("le:%d", id)
		entry.TransactionTime = transactionTime
		descending = append(descending, entry)
	}

	for i, j := 0, len(descending)-1; i < j; i, j = i+1, j-1 {
		descending[i], descending[j] = descending[j], descending[i]
	}

	return descending
}

func (s *Service) reconciliationSummaryFromDB(from *time.Time, to *time.Time) (ReconciliationSummary, error) {
	ctx, cancel := context.WithTimeout(context.Background(), walletDBTimeout)
	defer cancel()

	conditions := make([]string, 0, 2)
	args := make([]any, 0, 2)
	if from != nil {
		conditions = append(conditions, fmt.Sprintf("transaction_time >= $%d", len(args)+1))
		args = append(args, from.UTC())
	}
	if to != nil {
		conditions = append(conditions, fmt.Sprintf("transaction_time <= $%d", len(args)+1))
		args = append(args, to.UTC())
	}

	query := `
SELECT
  COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount_cents ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount_cents ELSE 0 END), 0),
  COUNT(1),
  COUNT(DISTINCT user_id)
FROM wallet_ledger`
	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	var summary ReconciliationSummary
	if from != nil {
		summary.From = from.UTC().Format(time.RFC3339)
	}
	if to != nil {
		summary.To = to.UTC().Format(time.RFC3339)
	}

	if err := s.db.QueryRowContext(ctx, query, args...).Scan(
		&summary.TotalCredits,
		&summary.TotalDebits,
		&summary.EntryCount,
		&summary.DistinctUserIDs,
	); err != nil {
		return ReconciliationSummary{}, err
	}
	summary.NetMovement = summary.TotalCredits - summary.TotalDebits
	return summary, nil
}

func findExistingMutation(ctx context.Context, tx *sql.Tx, kind string, userID string, idempotencyKey string) (LedgerEntry, bool, error) {
	var (
		id              int64
		entry           LedgerEntry
		transactionTime string
	)
	err := tx.QueryRowContext(ctx, `
SELECT id, user_id, entry_type, amount_cents, balance_cents, idempotency_key, COALESCE(reason, ''), CAST(transaction_time AS TEXT)
FROM wallet_ledger
WHERE entry_type = $1 AND user_id = $2 AND idempotency_key = $3
LIMIT 1`, kind, userID, idempotencyKey).Scan(
		&id,
		&entry.UserID,
		&entry.Type,
		&entry.AmountCents,
		&entry.BalanceCents,
		&entry.IdempotencyKey,
		&entry.Reason,
		&transactionTime,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return LedgerEntry{}, false, nil
		}
		return LedgerEntry{}, false, err
	}
	entry.EntryID = fmt.Sprintf("le:%d", id)
	entry.TransactionTime = transactionTime
	return entry, true, nil
}

func normalizeReason(reason string) any {
	trimmed := strings.TrimSpace(reason)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func parseEntryTime(raw string) (time.Time, bool) {
	layouts := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02 15:04:05-07",
		"2006-01-02 15:04:05-07:00",
	}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, raw); err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}

type correctionIssue struct {
	UserID                   string
	Type                     string
	CurrentBalanceCents      int64
	SuggestedAdjustmentCents int64
	Reason                   string
	Details                  string
	AutomationSource         string
}

func (s *Service) collectCorrectionIssues() ([]correctionIssue, error) {
	if s.db != nil {
		return s.collectCorrectionIssuesDB()
	}
	return s.collectCorrectionIssuesMemory(), nil
}

func (s *Service) collectCorrectionIssuesMemory() []correctionIssue {
	s.mu.RLock()
	defer s.mu.RUnlock()

	userIDs := map[string]struct{}{}
	for userID := range s.balances {
		userIDs[userID] = struct{}{}
	}
	for userID := range s.ledger {
		userIDs[userID] = struct{}{}
	}

	out := make([]correctionIssue, 0, len(userIDs))
	for userID := range userIDs {
		balance := s.balances[userID]
		entries := s.ledger[userID]
		lastLedgerBalance := int64(0)
		if len(entries) > 0 {
			lastLedgerBalance = entries[len(entries)-1].BalanceCents
		}

		if balance < 0 {
			out = append(out, correctionIssue{
				UserID:                   userID,
				Type:                     "negative_balance",
				CurrentBalanceCents:      balance,
				SuggestedAdjustmentCents: -balance,
				Reason:                   "negative wallet balance detected",
				Details:                  fmt.Sprintf("balance=%d", balance),
				AutomationSource:         "scanner_v1",
			})
		}
		if lastLedgerBalance != balance {
			out = append(out, correctionIssue{
				UserID:                   userID,
				Type:                     "ledger_drift",
				CurrentBalanceCents:      balance,
				SuggestedAdjustmentCents: lastLedgerBalance - balance,
				Reason:                   "ledger and balance mismatch",
				Details:                  fmt.Sprintf("balance=%d expectedFromLedger=%d", balance, lastLedgerBalance),
				AutomationSource:         "scanner_v1",
			})
		}
	}
	return out
}

func (s *Service) collectCorrectionIssuesDB() ([]correctionIssue, error) {
	ctx, cancel := context.WithTimeout(context.Background(), walletDBTimeout)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, `
SELECT
  b.user_id,
  b.balance_cents,
  COALESCE(
    (
      SELECT l.balance_cents
      FROM wallet_ledger l
      WHERE l.user_id = b.user_id
      ORDER BY l.id DESC
      LIMIT 1
    ),
    0
  ) AS ledger_balance_cents
FROM wallet_balances b`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]correctionIssue, 0)
	for rows.Next() {
		var (
			userID            string
			balance           int64
			lastLedgerBalance int64
		)
		if err := rows.Scan(&userID, &balance, &lastLedgerBalance); err != nil {
			return nil, err
		}
		if balance < 0 {
			out = append(out, correctionIssue{
				UserID:                   userID,
				Type:                     "negative_balance",
				CurrentBalanceCents:      balance,
				SuggestedAdjustmentCents: -balance,
				Reason:                   "negative wallet balance detected",
				Details:                  fmt.Sprintf("balance=%d", balance),
				AutomationSource:         "scanner_v1",
			})
		}
		if lastLedgerBalance != balance {
			out = append(out, correctionIssue{
				UserID:                   userID,
				Type:                     "ledger_drift",
				CurrentBalanceCents:      balance,
				SuggestedAdjustmentCents: lastLedgerBalance - balance,
				Reason:                   "ledger and balance mismatch",
				Details:                  fmt.Sprintf("balance=%d expectedFromLedger=%d", balance, lastLedgerBalance),
				AutomationSource:         "scanner_v1",
			})
		}
	}
	return out, rows.Err()
}

func findOpenCorrectionTaskLocked(tasks map[string]CorrectionTask, userID string, taskType string) (string, CorrectionTask, bool) {
	for taskID, task := range tasks {
		if strings.EqualFold(task.Status, "open") &&
			strings.EqualFold(task.UserID, userID) &&
			strings.EqualFold(task.Type, taskType) {
			return taskID, task, true
		}
	}
	return "", CorrectionTask{}, false
}

func (s *Service) listCorrectionTasksLocked(status string, userID string, limit int) []CorrectionTask {
	normalizedStatus := strings.ToLower(strings.TrimSpace(status))
	normalizedUserID := strings.TrimSpace(userID)
	normalizedLimit := limit
	if normalizedLimit <= 0 {
		normalizedLimit = 50
	}
	if normalizedLimit > 500 {
		normalizedLimit = 500
	}

	items := make([]CorrectionTask, 0, len(s.correctionTasks))
	for _, task := range s.correctionTasks {
		if normalizedStatus != "" && !strings.EqualFold(task.Status, normalizedStatus) {
			continue
		}
		if normalizedUserID != "" && !strings.EqualFold(task.UserID, normalizedUserID) {
			continue
		}
		items = append(items, task)
	}

	sort.SliceStable(items, func(i, j int) bool {
		if items[i].UpdatedAt == items[j].UpdatedAt {
			return items[i].TaskID > items[j].TaskID
		}
		return items[i].UpdatedAt > items[j].UpdatedAt
	})
	if len(items) > normalizedLimit {
		items = items[:normalizedLimit]
	}
	return items
}

func (s *Service) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), walletDBTimeout)
	defer cancel()

	statements := []string{
		`CREATE TABLE IF NOT EXISTS wallet_balances (
  user_id TEXT PRIMARY KEY,
  balance_cents BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`CREATE TABLE IF NOT EXISTS wallet_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  balance_cents BIGINT NOT NULL,
  idempotency_key TEXT NOT NULL,
  reason TEXT,
  transaction_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entry_type, user_id, idempotency_key)
)`,
	}

	for _, statement := range statements {
		if _, err := s.db.ExecContext(ctx, statement); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) loadFromDisk() error {
	raw, err := os.ReadFile(s.statePath)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}

	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 {
		return nil
	}

	var state persistedWalletState
	if err := json.Unmarshal(trimmed, &state); err != nil {
		return err
	}

	if state.Balances != nil {
		s.balances = state.Balances
	}
	if state.Ledger != nil {
		s.ledger = state.Ledger
	}
	if state.IdempotencyMap != nil {
		s.idempotencyMap = state.IdempotencyMap
	}
	s.sequence = state.Sequence
	if state.CorrectionTasks != nil {
		s.correctionTasks = state.CorrectionTasks
	}
	s.correctionSeq = state.CorrectionSeq
	return nil
}

func (s *Service) persistLocked() error {
	if s.statePath == "" {
		return nil
	}

	state := persistedWalletState{
		Balances:        s.balances,
		Ledger:          s.ledger,
		IdempotencyMap:  s.idempotencyMap,
		Sequence:        s.sequence,
		CorrectionTasks: s.correctionTasks,
		CorrectionSeq:   s.correctionSeq,
	}

	if err := os.MkdirAll(filepath.Dir(s.statePath), 0o755); err != nil {
		return err
	}

	tempPath := s.statePath + ".tmp"
	file, err := os.Create(tempPath)
	if err != nil {
		return err
	}

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(state); err != nil {
		_ = file.Close()
		_ = os.Remove(tempPath)
		return err
	}
	if err := file.Close(); err != nil {
		_ = os.Remove(tempPath)
		return err
	}
	if err := os.Rename(tempPath, s.statePath); err != nil {
		_ = os.Remove(tempPath)
		return err
	}
	return nil
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
