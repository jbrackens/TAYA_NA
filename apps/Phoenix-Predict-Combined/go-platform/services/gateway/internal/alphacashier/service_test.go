package alphacashier

import (
	"context"
	"math/big"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
)

func TestServiceWalletConnectAndDepositIntent(t *testing.T) {
	key, err := crypto.HexToECDSA("4c0883a69102937d6231471b5dbb6204fe51296170827944e48f8b7f95b35c5f")
	if err != nil {
		t.Fatalf("private key fixture: %v", err)
	}
	address := crypto.PubkeyToAddress(key.PublicKey).Hex()
	svc := NewService(testConfig(), NewMemoryRepository())
	fixedNow := time.Date(2026, 5, 27, 12, 0, 0, 0, time.UTC)
	svc.now = func() time.Time { return fixedNow }

	challenge, err := svc.CreateWalletChallenge(context.Background(), "u-1", address)
	if err != nil {
		t.Fatalf("CreateWalletChallenge: %v", err)
	}
	sig, err := crypto.Sign(accounts.TextHash([]byte(challenge.Message)), key)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	conn, err := svc.ConnectWallet(context.Background(), "u-1", challenge.Nonce, hexutil.Encode(sig))
	if err != nil {
		t.Fatalf("ConnectWallet: %v", err)
	}
	if conn.NormalizedAddress == "" {
		t.Fatalf("expected normalized address")
	}

	intent, err := svc.CreateDepositIntent(context.Background(), "u-1", address, 2500, "idem-1")
	if err != nil {
		t.Fatalf("CreateDepositIntent: %v", err)
	}
	if intent.AmountUnits != "25000000" {
		t.Fatalf("amount units: got %s, want 25000000", intent.AmountUnits)
	}
	if intent.Status != "created" {
		t.Fatalf("status: got %s", intent.Status)
	}

	replay, err := svc.CreateDepositIntent(context.Background(), "u-1", address, 2500, "idem-1")
	if err != nil {
		t.Fatalf("CreateDepositIntent replay: %v", err)
	}
	if replay.ID != intent.ID {
		t.Fatalf("idempotent replay returned different intent: %s vs %s", replay.ID, intent.ID)
	}
}

func TestServiceCreateDepositIntentRequiresConnectedWallet(t *testing.T) {
	svc := NewService(testConfig(), NewMemoryRepository())
	_, err := svc.CreateDepositIntent(context.Background(), "u-1", "0x0000000000000000000000000000000000000009", 2500, "idem-1")
	if err == nil {
		t.Fatalf("expected unconnected wallet to fail")
	}
}

func TestServiceDisabledFailsClosed(t *testing.T) {
	svc := NewService(Config{Enabled: false}, NewMemoryRepository())
	_, err := svc.CreateWalletChallenge(context.Background(), "u-1", "0x0000000000000000000000000000000000000009")
	if err == nil {
		t.Fatalf("expected disabled service to fail")
	}
}

func TestServiceCreateWithdrawalRequestHoldsFunds(t *testing.T) {
	svc := NewService(testConfig(), NewMemoryRepository())
	ledger := &fakeLedger{}
	svc.SetWalletLedger(ledger)
	req, err := svc.CreateWithdrawalRequest(context.Background(), "u-1", "0x0000000000000000000000000000000000000009", 2500, "wd-1")
	if err != nil {
		t.Fatalf("CreateWithdrawalRequest: %v", err)
	}
	if req.Status != "requested" || req.AmountUnits != "25000000" || req.WalletReservationID == "" {
		t.Fatalf("unexpected withdrawal request: %+v", req)
	}
	if got := ledger.holds[req.ID]; got.ReferenceType != withdrawalReferenceType || got.AmountCents != 2500 {
		t.Fatalf("hold not recorded correctly: %+v", got)
	}

	replay, err := svc.CreateWithdrawalRequest(context.Background(), "u-1", "0x0000000000000000000000000000000000000009", 2500, "wd-1")
	if err != nil {
		t.Fatalf("CreateWithdrawalRequest replay: %v", err)
	}
	if replay.ID != req.ID {
		t.Fatalf("idempotent replay returned different request: %s vs %s", replay.ID, req.ID)
	}
}

func TestServiceWithdrawalReviewLifecycle(t *testing.T) {
	svc := NewService(testConfig(), NewMemoryRepository())
	ledger := &fakeLedger{}
	svc.SetWalletLedger(ledger)
	req, err := svc.CreateWithdrawalRequest(context.Background(), "u-1", "0x0000000000000000000000000000000000000009", 2500, "wd-1")
	if err != nil {
		t.Fatalf("CreateWithdrawalRequest: %v", err)
	}
	approved, err := svc.ApproveWithdrawal(context.Background(), req.ID, "admin-1", "manual alpha approval")
	if err != nil {
		t.Fatalf("ApproveWithdrawal: %v", err)
	}
	if approved.Status != "approved" {
		t.Fatalf("approved status: got %s", approved.Status)
	}
	broadcasted, err := svc.MarkWithdrawalBroadcasted(context.Background(), req.ID, "admin-1", testTxHash())
	if err != nil {
		t.Fatalf("MarkWithdrawalBroadcasted: %v", err)
	}
	if broadcasted.Status != "broadcasted" || broadcasted.BroadcastTxHash == "" {
		t.Fatalf("broadcasted request: %+v", broadcasted)
	}
	completed, err := svc.MarkWithdrawalCompleted(context.Background(), req.ID, "admin-1")
	if err != nil {
		t.Fatalf("MarkWithdrawalCompleted: %v", err)
	}
	if completed.Status != "completed" {
		t.Fatalf("completed status: got %s", completed.Status)
	}
	if len(ledger.captured) != 1 {
		t.Fatalf("capture calls: got %d, want 1", len(ledger.captured))
	}
}

func TestServiceRejectWithdrawalReleasesFunds(t *testing.T) {
	svc := NewService(testConfig(), NewMemoryRepository())
	ledger := &fakeLedger{}
	svc.SetWalletLedger(ledger)
	req, err := svc.CreateWithdrawalRequest(context.Background(), "u-1", "0x0000000000000000000000000000000000000009", 2500, "wd-1")
	if err != nil {
		t.Fatalf("CreateWithdrawalRequest: %v", err)
	}
	rejected, err := svc.RejectWithdrawal(context.Background(), req.ID, "admin-1", "destination mismatch")
	if err != nil {
		t.Fatalf("RejectWithdrawal: %v", err)
	}
	if rejected.Status != "rejected" {
		t.Fatalf("rejected status: got %s", rejected.Status)
	}
	if len(ledger.released) != 1 {
		t.Fatalf("release calls: got %d, want 1", len(ledger.released))
	}
}

func TestServiceReconciliationSummaryIncludesTreasuryBalance(t *testing.T) {
	repo := NewMemoryRepository()
	svc := NewService(testConfig(), repo)
	svc.SetEVMClient(fakeEVMClient{balance: bigInt(25000000)})
	now := svc.now().UTC()
	if _, err := repo.SaveDepositIntent(context.Background(), DepositIntent{
		UserID:         "u-1",
		AmountCents:    2500,
		AmountUnits:    "25000000",
		Status:         "created",
		IdempotencyKey: "dep-1",
		ExpiresAt:      now.Add(time.Hour),
		CreatedAt:      now,
		UpdatedAt:      now,
	}); err != nil {
		t.Fatalf("SaveDepositIntent: %v", err)
	}
	if _, err := repo.MarkDepositCredited(context.Background(), "adi:mem:1", "le-1", now, now); err != nil {
		t.Fatalf("MarkDepositCredited: %v", err)
	}
	summary, err := svc.ReconciliationSummary(context.Background())
	if err != nil {
		t.Fatalf("ReconciliationSummary: %v", err)
	}
	if summary.CreditedDepositCents != 2500 || summary.TreasuryBalanceCents != 2500 || summary.CashierDriftCents != 0 {
		t.Fatalf("unexpected summary: %+v", summary)
	}
}

func testConfig() Config {
	return Config{
		Enabled:                true,
		ChainID:                8453,
		ChainName:              "base",
		RPCURL:                 "https://rpc.example",
		TokenSymbol:            "USDC",
		TokenAddress:           "0x0000000000000000000000000000000000000001",
		TokenDecimals:          6,
		TreasuryAddress:        "0x0000000000000000000000000000000000000002",
		Confirmations:          12,
		MinDepositCents:        100,
		MaxDepositCents:        25000,
		DailyDepositLimitCents: 100000,
		WithdrawalsEnabled:     true,
		WithdrawalReviewNeeded: true,
	}
}

func bigInt(n int64) *big.Int {
	return big.NewInt(n)
}
