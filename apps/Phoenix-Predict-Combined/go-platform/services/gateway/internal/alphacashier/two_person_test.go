package alphacashier

import (
	"context"
	"errors"
	"testing"
)

// Audit A2-04: with two-person control on, the operator who broadcasts a
// withdrawal must differ from the one who approved it.
func TestTwoPersonWithdrawalControl(t *testing.T) {
	const (
		dest      = "0x0000000000000000000000000000000000000009"
		txHash    = "0x" + "11" + "00000000000000000000000000000000000000000000000000000000000000" // 66 chars
		approver  = "ops-alice"
		different = "ops-bob"
	)

	newSvc := func(twoPerson bool) *Service {
		cfg := testConfig()
		cfg.TwoPersonWithdrawal = twoPerson
		svc := NewService(cfg, NewMemoryRepository())
		svc.SetWalletLedger(&fakeLedger{})
		return svc
	}

	mkApproved := func(t *testing.T, svc *Service, key string) *WithdrawalRequest {
		t.Helper()
		req, err := svc.CreateWithdrawalRequest(context.Background(), "u-1", dest, 2500, key)
		if err != nil {
			t.Fatalf("CreateWithdrawalRequest: %v", err)
		}
		if _, err := svc.ApproveWithdrawal(context.Background(), req.ID, approver, "looks good"); err != nil {
			t.Fatalf("ApproveWithdrawal: %v", err)
		}
		return req
	}

	t.Run("same operator blocked under two-person", func(t *testing.T) {
		svc := newSvc(true)
		req := mkApproved(t, svc, "wd-same")
		_, err := svc.MarkWithdrawalBroadcasted(context.Background(), req.ID, approver, txHash)
		if !errors.Is(err, ErrSecondApproverRequired) {
			t.Fatalf("same approver+broadcaster must be blocked, got %v", err)
		}
	})

	t.Run("different operator allowed under two-person", func(t *testing.T) {
		svc := newSvc(true)
		req := mkApproved(t, svc, "wd-diff")
		if _, err := svc.MarkWithdrawalBroadcasted(context.Background(), req.ID, different, txHash); err != nil {
			t.Fatalf("different operator must be allowed, got %v", err)
		}
	})

	t.Run("control off allows same operator", func(t *testing.T) {
		svc := newSvc(false)
		req := mkApproved(t, svc, "wd-off")
		if _, err := svc.MarkWithdrawalBroadcasted(context.Background(), req.ID, approver, txHash); err != nil {
			t.Fatalf("with control off the same operator may broadcast, got %v", err)
		}
	})
}

// Boot validation: prod with withdrawals enabled requires two-person on or an
// explicit ack-off.
func TestTwoPersonBootValidation(t *testing.T) {
	base := map[string]string{
		"ENVIRONMENT":                          "production",
		"ALPHA_CASHIER_ENABLED":                "true",
		"ALPHA_CASHIER_RPC_URL":                "https://rpc.example",
		"ALPHA_CASHIER_TOKEN_ADDRESS":          "0x0000000000000000000000000000000000000001",
		"ALPHA_CASHIER_TREASURY_ADDRESS":       "0x0000000000000000000000000000000000000002",
		"ALPHA_CASHIER_WITHDRAWALS_ENABLED":    "true",
		"ALPHA_CASHIER_WITHDRAWAL_BROADCAST_ACK": "true",
	}
	getenv := func(over map[string]string) func(string) string {
		m := map[string]string{}
		for k, v := range base {
			m[k] = v
		}
		for k, v := range over {
			m[k] = v
		}
		return func(k string) string { return m[k] }
	}

	if err := ValidateRuntimeConfig(getenv(nil)); err == nil {
		t.Fatal("expected boot error: two-person control neither on nor acked off")
	}
	if err := ValidateRuntimeConfig(getenv(map[string]string{"ALPHA_CASHIER_TWO_PERSON_WITHDRAWAL": "true"})); err != nil {
		t.Fatalf("two-person on should boot, got %v", err)
	}
	if err := ValidateRuntimeConfig(getenv(map[string]string{"ALPHA_CASHIER_TWO_PERSON_WITHDRAWAL_ACK_DISABLED": "true"})); err != nil {
		t.Fatalf("explicit ack-off should boot, got %v", err)
	}
}
