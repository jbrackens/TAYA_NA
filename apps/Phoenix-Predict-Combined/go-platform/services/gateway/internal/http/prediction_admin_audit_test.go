package http

import (
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/prediction"
)

// TestProviderOpsAuditSurfacesInAdminLogs verifies that a money-audit entry
// recorded via recordMoneyAuditEntry is converted into the admin audit-log
// shape the live /api/v1/admin/audit-logs endpoint serves — closing the loop so
// wallet/settlement audit is visible in the office.
func TestProviderOpsAuditSurfacesInAdminLogs(t *testing.T) {
	recordMoneyAuditEntry("admin-surf-1", "wallet.credit", "u-surf-1", map[string]any{
		"amountCents":    int64(999),
		"idempotencyKey": "surf-key-1",
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
		t.Fatal("money-audit entry should surface in admin audit logs")
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
