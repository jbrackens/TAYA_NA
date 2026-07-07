package prediction

import (
	"context"
	"testing"
)

type captureSettlementAuditor struct {
	calls []capturedSettlementAudit
}

type capturedSettlementAudit struct {
	actorID  string
	marketID string
	details  map[string]any
}

func (c *captureSettlementAuditor) RecordSettlement(actorID, marketID string, details map[string]any) {
	c.calls = append(c.calls, capturedSettlementAudit{actorID: actorID, marketID: marketID, details: details})
}

// TestResolveMarket_AutoSettleAuditsAsAutoSettler covers the non-atomic settle
// path: a settlement with no explicit actor (the AutoSettler path, settledBy ==
// nil) is audited under the "auto-settler" actor.
func TestResolveMarket_AutoSettleAuditsAsAutoSettler(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed

	svc := NewService(repo, &fakeWallet{balances: map[string]int64{"alice": 0}})
	auditor := &captureSettlementAuditor{}
	svc.SetSettlementAuditor(auditor)

	if _, _, err := svc.ResolveMarket(context.Background(), "mkt-1", ResolveMarketRequest{
		Result:            MarketResultYes,
		AttestationSource: "admin",
	}, nil); err != nil {
		t.Fatalf("ResolveMarket: %v", err)
	}

	if len(auditor.calls) != 1 {
		t.Fatalf("expected 1 settlement audit call, got %d", len(auditor.calls))
	}
	if auditor.calls[0].actorID != "auto-settler" {
		t.Errorf("auto-settle audit actor: want auto-settler, got %q", auditor.calls[0].actorID)
	}
	if auditor.calls[0].marketID == "" {
		t.Error("audit marketID should not be empty")
	}
	if _, ok := auditor.calls[0].details["settlementId"]; !ok {
		t.Error("audit details should include settlementId")
	}
	if auditor.calls[0].details["unit"] != "PTS" {
		t.Fatalf("audit details should include PTS unit, got %+v", auditor.calls[0].details)
	}
	if _, ok := auditor.calls[0].details["totalSettlementPoints"]; !ok {
		t.Fatalf("audit details should include point-native settlement total, got %+v", auditor.calls[0].details)
	}
	for _, retired := range []string{"totalPayoutPoints", "payoutCount", "currency"} {
		if _, ok := auditor.calls[0].details[retired]; ok {
			t.Fatalf("audit details should not include retired %s: %+v", retired, auditor.calls[0].details)
		}
	}
}

// TestResolveMarket_AdminSettleAuditsActorAtomic covers the atomic (production,
// DB-backed) settle path and verifies an admin-triggered settlement is audited
// under that admin's id.
func TestResolveMarket_AdminSettleAuditsActorAtomic(t *testing.T) {
	repo := &atomicMemRepo{memRepo: newMemRepo()}
	m := seedMarket(t, repo.memRepo)
	m.Status = MarketStatusClosed

	svc := NewService(repo, &fakeTxWallet{fakeWallet: &fakeWallet{balances: map[string]int64{"alice": 0}}})
	auditor := &captureSettlementAuditor{}
	svc.SetSettlementAuditor(auditor)

	if _, _, err := svc.ResolveMarket(context.Background(), "mkt-1", ResolveMarketRequest{
		Result:            MarketResultNo,
		AttestationSource: "admin",
	}, strPtr("admin-9")); err != nil {
		t.Fatalf("ResolveMarket (atomic): %v", err)
	}

	if repo.atomicSettlementCalls != 1 {
		t.Fatalf("expected atomic path, got %d atomic settlement calls", repo.atomicSettlementCalls)
	}
	if len(auditor.calls) != 1 {
		t.Fatalf("expected 1 settlement audit call, got %d", len(auditor.calls))
	}
	if auditor.calls[0].actorID != "admin-9" {
		t.Errorf("admin-settle audit actor: want admin-9, got %q", auditor.calls[0].actorID)
	}
	if auditor.calls[0].details["unit"] != "PTS" {
		t.Fatalf("admin settle audit should include PTS unit, got %+v", auditor.calls[0].details)
	}
	if _, ok := auditor.calls[0].details["pointDisbursementCount"]; !ok {
		t.Fatalf("admin settle audit should include point disbursement count, got %+v", auditor.calls[0].details)
	}
	if _, ok := auditor.calls[0].details["totalPayoutPoints"]; ok {
		t.Fatalf("admin settle audit should not include totalPayoutPoints: %+v", auditor.calls[0].details)
	}
}
