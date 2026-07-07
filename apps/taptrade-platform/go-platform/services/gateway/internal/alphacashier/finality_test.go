package alphacashier

import (
	"context"
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// Audit A2-03: the finality re-check must distinguish a still-canonical tx
// (pending/finalized) from one a reorg orphaned or re-mined (reorged).
func TestCheckDepositFinality(t *testing.T) {
	const txHash = "0x00000000000000000000000000000000000000000000000000000000000000aa"
	credited := ChainTransaction{
		TxHash:      txHash,
		BlockNumber: 100,
		BlockHash:   common.HexToHash("0xabc123").Hex(),
	}
	receiptAt := func(block int64, hash string) *types.Receipt {
		return &types.Receipt{
			TxHash:      common.HexToHash(txHash),
			Status:      types.ReceiptStatusSuccessful,
			BlockNumber: big.NewInt(block),
			BlockHash:   common.HexToHash(hash),
		}
	}

	t.Run("finalized when deep enough and same block", func(t *testing.T) {
		c := fakeEVMClient{receipt: receiptAt(100, "0xabc123"), latest: 200}
		got, err := CheckDepositFinality(context.Background(), c, credited, 64)
		if err != nil || got != FinalityFinalized {
			t.Fatalf("want finalized, got %v err=%v", got, err)
		}
	})

	t.Run("pending when not yet deep enough", func(t *testing.T) {
		c := fakeEVMClient{receipt: receiptAt(100, "0xabc123"), latest: 110}
		got, err := CheckDepositFinality(context.Background(), c, credited, 64)
		if err != nil || got != FinalityPending {
			t.Fatalf("want pending, got %v err=%v", got, err)
		}
	})

	t.Run("reorged when tx vanished from canonical chain", func(t *testing.T) {
		c := fakeEVMClient{receipt: nil, latest: 200} // TransactionReceipt -> NotFound
		got, err := CheckDepositFinality(context.Background(), c, credited, 64)
		if err != nil || got != FinalityReorged {
			t.Fatalf("want reorged (not-found), got %v err=%v", got, err)
		}
	})

	t.Run("reorged when re-mined into a different block", func(t *testing.T) {
		c := fakeEVMClient{receipt: receiptAt(105, "0xdifferent"), latest: 200}
		got, err := CheckDepositFinality(context.Background(), c, credited, 64)
		if err != nil || got != FinalityReorged {
			t.Fatalf("want reorged (block hash mismatch), got %v err=%v", got, err)
		}
	})
}

// FreezeReorgedDeposit must place an idempotent hold on the credited amount so
// the now-unbacked balance can't be withdrawn.
func TestFreezeReorgedDepositHoldsFunds(t *testing.T) {
	svc := NewService(testConfig(), NewMemoryRepository())
	ledger := &fakeLedger{}
	svc.SetWalletLedger(ledger)

	if err := svc.FreezeReorgedDeposit(context.Background(), "dep-1", "u-1", 2500); err != nil {
		t.Fatalf("FreezeReorgedDeposit: %v", err)
	}
	if len(ledger.holds) != 1 {
		t.Fatalf("expected exactly one hold, got %d", len(ledger.holds))
	}
	for _, h := range ledger.holds {
		if h.AmountPoints != 2500 || h.ReferenceType != "alpha_cashier_reorg_freeze" {
			t.Fatalf("unexpected hold: %+v", h)
		}
	}

	// Idempotent: a second freeze for the same deposit re-asserts the same
	// hold key rather than stacking a new reservation.
	if err := svc.FreezeReorgedDeposit(context.Background(), "dep-1", "u-1", 2500); err != nil {
		t.Fatalf("second FreezeReorgedDeposit: %v", err)
	}
	if len(ledger.holds) != 1 {
		t.Fatalf("freeze must be idempotent by deposit id; holds=%d", len(ledger.holds))
	}
}
