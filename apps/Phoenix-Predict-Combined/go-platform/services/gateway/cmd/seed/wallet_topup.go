package main

import (
	"context"
	"fmt"

	"phoenix-revival/gateway/internal/wallet"
)

// walletTopUp ensures every demo user has at least `target` cents in their
// wallet_balances row. It uses Credit with an idempotency key keyed on the
// user, so subsequent demo-seed runs are a no-op (the wallet ledger
// already has the deposit row and dedupes). The Credit path also creates
// a fresh wallet_balances row if the user doesn't have one yet — the seed
// runs against a DB where user-002 and user-003 were registered in
// auth_users but never got their first balance write.
//
// Each top-up logs the user, the delta credited, and the new balance. If
// the balance is already at-or-above target, the credit is skipped (so
// re-runs don't accumulate dead idempotency rows in the ledger).
type topupTarget struct {
	UserID string
	Cents  int64
}

// demoTopupTargets is the set of starting balances Phase 2/4 expect.
// Numbers chosen so:
//   - bot can absorb 116 markets × 5 levels × 100 shares × ~50¢ avg
//     × 2 sides = ~$58k of bid-reservations from Phase 1, plus
//     ~$3k of issuance matches in Phase 2, plus Phase 4 demo flow.
//     The $200k target leaves comfortable headroom for re-runs.
//   - takers can place 30-40 small trades each before going broke.
//   - the demo user (u-1) lands at $5,000 visible balance per the plan's
//     resolved decision (5k > 1k seed default).
var demoTopupTargets = []topupTarget{
	{UserID: demoUserID, Cents: 500_000},        // $5,000
	{UserID: demoTakerUserID1, Cents: 500_000},  // $5,000
	{UserID: demoTakerUserID2, Cents: 500_000},  // $5,000
	{UserID: demoTakerUserID3, Cents: 500_000},  // $5,000
	{UserID: demoBotUserID, Cents: 20_000_000},  // $200,000
}

func runWalletTopUp(walletSvc *wallet.Service) error {
	for _, t := range demoTopupTargets {
		current := walletSvc.Balance(context.Background(), t.UserID)
		if current >= t.Cents {
			continue
		}
		delta := t.Cents - current
		// Idempotency key encodes the starting balance so re-runs after
		// the user has spent some demo cash in Phase 2 produce a fresh
		// key (different delta) rather than colliding with the prior
		// run's key under a different payload. Hits the same key only
		// when the same (current, target) pair recurs exactly, which
		// is true for re-running -mode demo against an unchanged
		// snapshot but never after any demo activity ran.
		idemKey := fmt.Sprintf("demo:topup:%s:from%d:to%d", t.UserID, current, t.Cents)
		_, err := walletSvc.Credit(context.Background(), wallet.MutationRequest{
			UserID:         t.UserID,
			AmountCents:    delta,
			IdempotencyKey: idemKey,
			Reason:         "demo:seed wallet top-up to demo target",
		})
		if err != nil {
			return fmt.Errorf("topup %s by %d cents: %w", t.UserID, delta, err)
		}
		fmt.Printf("  topup %-10s  +$%-7.2f  -> $%.2f\n",
			t.UserID, float64(delta)/100, float64(t.Cents)/100)
	}
	return nil
}
