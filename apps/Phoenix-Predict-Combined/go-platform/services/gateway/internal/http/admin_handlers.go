package http

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	stdhttp "net/http"
	"os"
	"path/filepath"
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
	ID                  string `json:"id"`
	Action              string `json:"action"`
	ActorID             string `json:"actorId"`
	UserID              string `json:"userId,omitempty"`
	TargetID            string `json:"targetId"`
	FreebetID           string `json:"freebetId,omitempty"`
	OddsBoostID         string `json:"oddsBoostId,omitempty"`
	FreebetAppliedCents int64  `json:"freebetAppliedCents,omitempty"`
	OccurredAt          string `json:"occurredAt"`
	Details             string `json:"details"`
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

// recordMoneyAuditEntry appends an audit-log entry for a privileged,
// money-moving action (wallet adjustment, settlement, void). actorID is the
// admin from the validated session; details are JSON-encoded into the log.
func recordMoneyAuditEntry(actorID, action, targetID string, details map[string]any) {
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
// money audit log, so settlements (admin-triggered or AutoSettler) land in the
// same audit stream as wallet adjustments.
type settlementAuditRecorder struct{}

func (settlementAuditRecorder) RecordSettlement(actorID, marketID string, details map[string]any) {
	recordMoneyAuditEntry(actorID, "market.settled", marketID, details)
}

func registerAdminWalletMutationRoutes(mux *stdhttp.ServeMux, basePath string, walletService *wallet.Service) {
	adminCreditPath := fmt.Sprintf("%s/wallet/credit", basePath)
	adminDebitPath := fmt.Sprintf("%s/wallet/debit", basePath)

	mux.Handle(adminCreditPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		request, err := decodeWalletMutationRequest(r)
		if err != nil {
			return err
		}
		entry, err := walletService.Credit(wallet.MutationRequest{
			UserID:         request.UserID,
			AmountCents:    request.AmountCents,
			IdempotencyKey: request.IdempotencyKey,
			Reason:         request.Reason,
		})
		if err != nil {
			return mapWalletError(err)
		}
		recordMoneyAuditEntry(userIDFromRequest(r), "wallet.credit", request.UserID, map[string]any{
			"amountCents":    request.AmountCents,
			"idempotencyKey": request.IdempotencyKey,
			"reason":         request.Reason,
			"balanceCents":   entry.BalanceCents,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"entry":        entry,
			"balanceCents": entry.BalanceCents,
		})
	}))

	mux.Handle(adminDebitPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		request, err := decodeWalletMutationRequest(r)
		if err != nil {
			return err
		}
		entry, err := walletService.Debit(wallet.MutationRequest{
			UserID:         request.UserID,
			AmountCents:    request.AmountCents,
			IdempotencyKey: request.IdempotencyKey,
			Reason:         request.Reason,
		})
		if err != nil {
			return mapWalletError(err)
		}
		recordMoneyAuditEntry(userIDFromRequest(r), "wallet.debit", request.UserID, map[string]any{
			"amountCents":    request.AmountCents,
			"idempotencyKey": request.IdempotencyKey,
			"reason":         request.Reason,
			"balanceCents":   entry.BalanceCents,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"entry":        entry,
			"balanceCents": entry.BalanceCents,
		})
	}))
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

// adminActorFromRequest returns the actor id for audit attribution on admin
// routes, from the X-Admin-Actor / X-Admin-User / X-Actor-Id headers, defaulting
// to "admin". Only consulted after requireAdminRole has authorized the caller.
func adminActorFromRequest(r *stdhttp.Request) string {
	candidates := []string{
		strings.TrimSpace(r.Header.Get("X-Admin-Actor")),
		strings.TrimSpace(r.Header.Get("X-Admin-User")),
		strings.TrimSpace(r.Header.Get("X-Actor-Id")),
	}
	for _, candidate := range candidates {
		if candidate != "" {
			return candidate
		}
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
