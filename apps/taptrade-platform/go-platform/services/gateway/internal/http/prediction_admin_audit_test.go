package http

import (
	"encoding/json"
	"strings"
	"testing"

	"taptrade/gateway/internal/prediction"
)

// TestProviderOpsAuditSurfacesInAdminLogs verifies that a provider-ops audit entry
// recorded via recordProviderOpsAuditAction is converted into the admin audit-log
// shape the live /api/v1/admin/audit-logs endpoint serves, closing the loop so
// point-wallet/settlement audit is visible in the office.
func TestProviderOpsAuditSurfacesInAdminLogs(t *testing.T) {
	recordProviderOpsAuditAction("admin-surf-1", "wallet.credit", "u-surf-1", map[string]any{
		"amountPointsCents": int64(999),
		"idempotencyKey":    "surf-key-1",
	})

	find := func(items []prediction.AdminAuditLog) *prediction.AdminAuditLog {
		for i := range items {
			it := items[i]
			if it.Action == "wallet.credit" &&
				it.TargetID != nil && *it.TargetID == "u-surf-1" &&
				it.ActorID != nil && *it.ActorID == "admin-surf-1" {
				return &items[i]
			}
		}
		return nil
	}

	got := find(providerOpsAuditAsAdminLogs(prediction.AdminAuditLogFilter{}))
	if got == nil {
		t.Fatal("provider-ops audit entry should surface in admin audit logs")
	}
	if got.ResourceType == nil || *got.ResourceType != "wallet" {
		t.Fatalf("resourceType should derive to 'wallet', got %v", got.ResourceType)
	}
	if !strings.Contains(string(got.Details), "surf-key-1") {
		t.Fatalf("details should carry the idempotency key, got %s", got.Details)
	}

	if find(providerOpsAuditAsAdminLogs(prediction.AdminAuditLogFilter{ResourceType: "wallet"})) == nil {
		t.Fatal("entry should match resourceType=wallet filter")
	}
	if find(providerOpsAuditAsAdminLogs(prediction.AdminAuditLogFilter{Action: "market.settled"})) != nil {
		t.Fatal("entry must not match a non-matching action filter")
	}
}

func TestProviderOpsAuditEntryOmitsRetiredPromoFields(t *testing.T) {
	recordProviderOpsAuditAction("admin-promo-field-1", "wallet.credit", "u-promo-field-1", map[string]any{
		"amountPointsCents": int64(100),
	})

	entries := providerOpsAuditSnapshot()
	if len(entries) == 0 {
		t.Fatal("expected provider-ops audit entry")
	}
	raw, err := json.Marshal(entries[len(entries)-1])
	if err != nil {
		t.Fatalf("marshal provider-ops audit entry: %v", err)
	}
	for _, retired := range []string{"freebetId", "oddsBoostId", "freebetAppliedCents"} {
		if strings.Contains(string(raw), retired) {
			t.Fatalf("provider-ops audit entry leaked retired field %s in %s", retired, string(raw))
		}
	}
}

func TestProviderOpsAuditAsAdminLogsRedactsLegacyUnsafeDetailsOnRead(t *testing.T) {
	entry := auditLogEntry{
		ID:         "audit-legacy-copy-redaction",
		Action:     "wallet.credit",
		ActorID:    "admin-legacy-copy",
		TargetID:   "u-legacy-copy",
		OccurredAt: "2026-06-30T18:15:00Z",
		Details:    `{"reason":"cash payout adjustment","idempotencyKey":"legacy-safe-key","nested":{"note":"crypto payout review"}}`,
	}
	recordProviderOpsAuditEntry(entry)

	rawFound := false
	for _, stored := range providerOpsAuditSnapshot() {
		if stored.ID == entry.ID {
			rawFound = true
			if !strings.Contains(stored.Details, "cash payout adjustment") ||
				!strings.Contains(stored.Details, "crypto payout review") {
				t.Fatalf("raw audit details should remain available for review, got %s", stored.Details)
			}
			break
		}
	}
	if !rawFound {
		t.Fatal("expected raw provider-ops audit entry in snapshot")
	}

	items := providerOpsAuditAsAdminLogs(prediction.AdminAuditLogFilter{ActorID: "admin-legacy-copy"})
	var got *prediction.AdminAuditLog
	for i := range items {
		if items[i].ID == entry.ID &&
			items[i].TargetID != nil && *items[i].TargetID == entry.TargetID {
			got = &items[i]
		}
	}
	if got == nil {
		t.Fatalf("expected filtered audit item %+v, got %+v", entry, items)
	}
	details := string(got.Details)
	if strings.Contains(details, "cash payout adjustment") || strings.Contains(details, "crypto payout review") {
		t.Fatalf("admin audit details leaked unsafe text: %s", details)
	}
	if !strings.Contains(details, launchRedactedUserText) || !strings.Contains(details, "legacy-safe-key") {
		t.Fatalf("expected redacted unsafe text and preserved safe fields, got %s", details)
	}
}

func TestPaginateAdminAuditLogs(t *testing.T) {
	items := make([]prediction.AdminAuditLog, 5)
	for i := range items {
		items[i] = prediction.AdminAuditLog{ID: string(rune('a' + i))}
	}

	page, meta := paginateAdminAuditLogs(items, 2, 2)
	if meta.Total != 5 || meta.Page != 2 || meta.PageSize != 2 || !meta.HasNext {
		t.Fatalf("unexpected meta: %+v", meta)
	}
	if len(page) != 2 || page[0].ID != "c" || page[1].ID != "d" {
		t.Fatalf("unexpected page slice: %+v", page)
	}

	// Page past the end returns empty, no panic.
	last, lastMeta := paginateAdminAuditLogs(items, 99, 2)
	if len(last) != 0 || lastMeta.HasNext {
		t.Fatalf("expected empty last page, got %d items hasNext=%v", len(last), lastMeta.HasNext)
	}
}
