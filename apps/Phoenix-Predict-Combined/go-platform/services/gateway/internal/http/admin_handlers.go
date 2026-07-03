package http

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	stdhttp "net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
)

var (
	providerOpsAuditMu        sync.Mutex
	providerOpsAuditEntries   []auditLogEntry
	providerOpsAuditStoreInit sync.Once
	providerOpsAuditStore     providerOpsAuditStoreBackend
	providerOpsAuditStoreMode string
	providerOpsAuditStorePath string
)

type auditLogEntry struct {
	ID         string `json:"id"`
	Action     string `json:"action"`
	ActorID    string `json:"actorId"`
	UserID     string `json:"userId,omitempty"`
	TargetID   string `json:"targetId"`
	OccurredAt string `json:"occurredAt"`
	Details    string `json:"details"`
}

func providerOpsAuditSnapshot() []auditLogEntry {
	initializeProviderOpsAuditStore()
	providerOpsAuditMu.Lock()
	defer providerOpsAuditMu.Unlock()
	if providerOpsAuditStore != nil {
		entries, err := providerOpsAuditStore.Load(providerOpsAuditLimit)
		if err != nil {
			slog.Warn("failed to load provider ops audit entries", "store_mode", providerOpsAuditStoreMode, "error", err)
		} else {
			providerOpsAuditEntries = trimAuditEntries(entries, providerOpsAuditLimit)
		}
	}
	out := make([]auditLogEntry, len(providerOpsAuditEntries))
	copy(out, providerOpsAuditEntries)
	return out
}

func recordProviderOpsAuditEntry(entry auditLogEntry) {
	initializeProviderOpsAuditStore()
	providerOpsAuditMu.Lock()
	defer providerOpsAuditMu.Unlock()
	providerOpsAuditEntries = append(providerOpsAuditEntries, entry)
	providerOpsAuditEntries = trimAuditEntries(providerOpsAuditEntries, providerOpsAuditLimit)
	if providerOpsAuditStore != nil {
		if err := providerOpsAuditStore.Append(entry, providerOpsAuditLimit); err != nil {
			auditWriteFailures.Add(1)
			slog.Warn("failed to persist provider ops audit entry", "store_mode", providerOpsAuditStoreMode, "error", err)
		}
		return
	}
	if err := persistProviderOpsAuditEntriesLocked(); err != nil {
		auditWriteFailures.Add(1)
		slog.Warn("failed to persist provider ops audit entries", "error", err)
	}
}

func initializeProviderOpsAuditStore() {
	providerOpsAuditStoreInit.Do(func() {
		store, mode, path, err := buildProviderOpsAuditStoreFromEnv()
		if err != nil {
			slog.Warn("failed to initialize provider ops audit store from env", "error", err)
			store = newProviderOpsAuditFileStore(defaultProviderOpsAuditPath)
			mode = "file"
			path = defaultProviderOpsAuditPath
		}
		providerOpsAuditStore = store
		providerOpsAuditStoreMode = mode
		providerOpsAuditStorePath = path

		entries, err := providerOpsAuditStore.Load(providerOpsAuditLimit)
		if err != nil {
			slog.Warn("failed to load provider ops audit entries", "store_mode", providerOpsAuditStoreMode, "error", err)
			return
		}
		providerOpsAuditMu.Lock()
		providerOpsAuditEntries = trimAuditEntries(entries, providerOpsAuditLimit)
		providerOpsAuditMu.Unlock()
	})
}

func loadProviderOpsAuditEntries(path string) ([]auditLogEntry, error) {
	if strings.TrimSpace(path) == "" {
		return []auditLogEntry{}, nil
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []auditLogEntry{}, nil
		}
		return nil, err
	}
	if len(raw) == 0 {
		return []auditLogEntry{}, nil
	}
	var entries []auditLogEntry
	if err := json.Unmarshal(raw, &entries); err != nil {
		return nil, err
	}
	if len(entries) > 500 {
		entries = append([]auditLogEntry{}, entries[len(entries)-500:]...)
	}
	return entries, nil
}

func persistProviderOpsAuditEntriesLocked() error {
	if strings.TrimSpace(providerOpsAuditStorePath) == "" {
		return nil
	}
	dir := filepath.Dir(providerOpsAuditStorePath)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}
	raw, err := json.MarshalIndent(providerOpsAuditEntries, "", "  ")
	if err != nil {
		return err
	}
	tempPath := providerOpsAuditStorePath + ".tmp"
	if err := os.WriteFile(tempPath, raw, 0o600); err != nil {
		return err
	}
	return os.Rename(tempPath, providerOpsAuditStorePath)
}

// recordProviderOpsAuditAction appends an audit-log entry for a privileged
// point/accounting or operator action. actorID is the admin from the validated
// session; details are JSON-encoded into the log.
func recordProviderOpsAuditAction(actorID, action, targetID string, details map[string]any) {
	if actorID == "" {
		actorID = "unknown"
	}
	payload, err := json.Marshal(details)
	if err != nil {
		payload = []byte("{}")
	}
	recordProviderOpsAuditEntry(auditLogEntry{
		ID:         fmt.Sprintf("al:%s:%d", action, time.Now().UTC().UnixNano()),
		Action:     action,
		ActorID:    actorID,
		TargetID:   targetID,
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
		Details:    string(payload),
	})
}

// settlementAuditRecorder bridges prediction.SettlementAuditor to the shared
// provider-ops audit log, so settlements (admin-triggered or AutoSettler) land
// in the same audit stream as point-wallet adjustments.
type settlementAuditRecorder struct{}

func (settlementAuditRecorder) RecordSettlement(actorID, marketID string, details map[string]any) {
	recordProviderOpsAuditAction(actorID, "market.settled", marketID, details)
}

func registerAdminWalletMutationRoutes(mux *stdhttp.ServeMux, basePath string, walletService *wallet.Service) {
	adminCreditPath := fmt.Sprintf("%s/wallet/credit", basePath)
	adminDebitPath := fmt.Sprintf("%s/wallet/debit", basePath)
	adminRewardClustersPath := fmt.Sprintf("%s/wallet/reward-clusters", basePath)

	mux.Handle(adminCreditPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminPermission(r, "finances:write"); err != nil {
			return err
		}

		request, err := decodeWalletMutationRequest(r)
		if err != nil {
			return err
		}
		// P0-6 (§7 Permission Model, §25 Admin Operations): a manual
		// adjustment at or above the dual-approval threshold must go through
		// maker-checker — this direct route would otherwise be a four-eyes
		// bypass. Refuse and point to the maker-checker submission endpoint.
		if err := requireDualApproval(request.AmountCents); err != nil {
			return err
		}
		entry, err := walletService.Credit(r.Context(), wallet.MutationRequest{
			UserID:         request.UserID,
			AmountCents:    request.AmountCents,
			IdempotencyKey: request.IdempotencyKey,
			Reason:         request.Reason,
		})
		if err != nil {
			return mapWalletError(err)
		}
		recordProviderOpsAuditAction(userIDFromRequest(r), "wallet.credit", request.UserID, map[string]any{
			"amountPointsCents":  request.AmountCents,
			"idempotencyKey":     request.IdempotencyKey,
			"reason":             request.Reason,
			"balancePointsCents": entry.BalanceCents,
			"unit":               "PTS",
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"entry":              walletLedgerEntryPayload(entry),
			"balancePointsCents": entry.BalanceCents,
			"unit":               "PTS",
		})
	}))

	mux.Handle(adminDebitPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminPermission(r, "finances:write"); err != nil {
			return err
		}

		request, err := decodeWalletMutationRequest(r)
		if err != nil {
			return err
		}
		// P0-6: same dual-approval gate on the debit path.
		if err := requireDualApproval(request.AmountCents); err != nil {
			return err
		}
		entry, err := walletService.Debit(r.Context(), wallet.MutationRequest{
			UserID:         request.UserID,
			AmountCents:    request.AmountCents,
			IdempotencyKey: request.IdempotencyKey,
			Reason:         request.Reason,
		})
		if err != nil {
			return mapWalletError(err)
		}
		recordProviderOpsAuditAction(userIDFromRequest(r), "wallet.debit", request.UserID, map[string]any{
			"amountPointsCents":  request.AmountCents,
			"idempotencyKey":     request.IdempotencyKey,
			"reason":             request.Reason,
			"balancePointsCents": entry.BalanceCents,
			"unit":               "PTS",
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"entry":              walletLedgerEntryPayload(entry),
			"balancePointsCents": entry.BalanceCents,
			"unit":               "PTS",
		})
	}))

	mux.Handle(adminRewardClustersPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		windowDate := strings.TrimSpace(r.URL.Query().Get("windowDate"))
		limit := 0
		if rawLimit := strings.TrimSpace(r.URL.Query().Get("limit")); rawLimit != "" {
			parsed, err := strconv.Atoi(rawLimit)
			if err != nil || parsed <= 0 {
				return httpx.BadRequest("limit must be a positive integer", map[string]any{"field": "limit"})
			}
			limit = parsed
		}
		items, err := walletService.RewardClusterSummaries(r.Context(), windowDate, limit)
		if err != nil {
			return err
		}
		if len(items) > 0 {
			windowDate = items[0].WindowDate
		} else if len(windowDate) >= len("2006-01-02") {
			windowDate = windowDate[:len("2006-01-02")]
		} else if windowDate == "" {
			windowDate = time.Now().UTC().Format("2006-01-02")
		}
		if strings.EqualFold(r.URL.Query().Get("format"), "csv") {
			return writeRewardClusterSummariesCSV(w, windowDate, items)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      items,
			"notes":      []string{"Signals are hashed; raw device and IP values are not returned.", "Reward cluster evidence is not point ledger movement."},
			"total":      len(items),
			"unit":       "PTS",
			"windowDate": windowDate,
		})
	}))
}

func writeRewardClusterSummariesCSV(w stdhttp.ResponseWriter, windowDate string, items []wallet.RewardClusterSummary) error {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="wallet-reward-clusters-`+csvSafeFilename(windowDate)+`.csv"`)

	writer := csv.NewWriter(w)
	if err := writer.Write([]string{
		"window_date",
		"signal_type",
		"signal_hash",
		"distinct_user_count",
		"user_ids",
		"unit",
	}); err != nil {
		return httpx.Internal("failed to write reward cluster csv", err)
	}
	for _, item := range items {
		if err := writer.Write([]string{
			csvSafeCell(item.WindowDate),
			csvSafeCell(item.SignalType),
			csvSafeCell(item.SignalHash),
			strconv.Itoa(item.DistinctUserCount),
			csvSafeCell(strings.Join(item.UserIDs, ";")),
			"PTS",
		}); err != nil {
			return httpx.Internal("failed to write reward cluster csv", err)
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return httpx.Internal("failed to flush reward cluster csv", err)
	}
	return nil
}

func parseAdminRFC3339(raw string, field string) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339, raw)
	if err == nil {
		return parsed, nil
	}
	parsed, err = time.Parse(time.RFC3339Nano, raw)
	if err == nil {
		return parsed, nil
	}
	return time.Time{}, httpx.BadRequest("timestamp must be RFC3339", map[string]any{
		"field": field,
		"value": raw,
	})
}

// adminActorFromRequest returns the actor id for audit attribution + two-person
// controls on admin routes. It is taken from the AUTHENTICATED session identity
// (username/email, then user id) — never a client-supplied header, which would
// be spoofable and could defeat the withdrawal broadcaster≠approver check and
// forge the audit trail (SECURITY-REVIEW #7). Only consulted after
// requireAdminRole has authorized the caller.
func adminActorFromRequest(r *stdhttp.Request) string {
	if email := strings.TrimSpace(httpx.UsernameFromContext(r.Context())); email != "" {
		return email
	}
	if uid := strings.TrimSpace(httpx.UserIDFromContext(r.Context())); uid != "" {
		return uid
	}
	return "admin"
}

// adminAnonBypassEnabled reports whether the dev-only anonymous admin bypass is
// active. MUST NOT be true in production — deployed environments refuse to boot
// with it set. Shared by requireAdminRole and the RBAC permission guard so the
// bypass condition has a single source of truth.
func adminAnonBypassEnabled() bool {
	return strings.EqualFold(os.Getenv("GATEWAY_ALLOW_ADMIN_ANON"), "true") &&
		strings.ToLower(os.Getenv("ENVIRONMENT")) != "production"
}

func requireAdminRole(r *stdhttp.Request) error {
	// Dev-only bypass (MUST NOT be used in production)
	if adminAnonBypassEnabled() {
		return nil
	}
	// Admin authority comes only from the validated session role. Never trust a
	// request header (e.g. X-Admin-Role) as a privilege source.
	if httpx.RoleFromContext(r.Context()) == "admin" {
		return nil
	}
	return httpx.Forbidden("admin role required")
}
