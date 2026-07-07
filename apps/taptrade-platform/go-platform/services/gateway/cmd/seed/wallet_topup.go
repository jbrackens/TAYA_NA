package main

import (
	"context"
	"fmt"

	"taptrade/gateway/internal/wallet"
)

// walletTopUp ensures every demo user has at least the configured point target
// in their wallet_balances row. It uses Credit with an idempotency key keyed on
// the user, so subsequent demo-seed runs are a no-op (the wallet ledger
// already has the top-up row and dedupes). The Credit path also creates
// a fresh wallet_balances row if the user doesn't have one yet — the seed
// runs against a DB where user-002 and user-003 were registered in
// auth_users but never got their first balance write.
//
// Each top-up logs the user, the delta credited, and the new balance. If
// the balance is already at-or-above target, the credit is skipped (so
// re-runs don't accumulate dead idempotency rows in the ledger).
type topupTarget struct {
	UserID string
	Points int64
}

// demoTopupTargets is the set of starting balances Phase 2/4 expect.
// Numbers chosen so:
//   - bot can absorb 116 markets x 5 levels x 100 shares x ~50 pts avg
//     x 2 sides = roughly 58k pts of bid-reservations from Phase 1, plus
//     roughly 3k pts of issuance matches in Phase 2, plus Phase 4 demo flow.
//     The 200k pts target leaves comfortable headroom for re-runs.
//   - takers can place 30-40 small predictions each before running low.
//   - the demo user (u-1) lands at 5,000 pts visible balance per the plan's
//     resolved decision (5k > 1k seed default).
var demoTopupTargets = []topupTarget{
	{UserID: demoUserID, Points: 500_000},       // 5,000 pts
	{UserID: demoTakerUserID1, Points: 500_000}, // 5,000 pts
	{UserID: demoTakerUserID2, Points: 500_000}, // 5,000 pts
	{UserID: demoTakerUserID3, Points: 500_000}, // 5,000 pts
	{UserID: demoBotUserID, Points: 20_000_000}, // 200,000 pts
}

func runWalletTopUp(walletSvc *wallet.Service) error {
	for _, t := range demoTopupTargets {
		current := walletSvc.Balance(context.Background(), t.UserID)
		if current >= t.Points {
			continue
		}
		delta := t.Points - current
		// Idempotency key encodes the starting balance so re-runs after
		// the user has spent some demo points in Phase 2 produce a fresh
		// key (different delta) rather than colliding with the prior
		// run's key under a different payload. Hits the same key only
		// when the same (current, target) pair recurs exactly, which
		// is true for re-running -mode demo against an unchanged
		// snapshot but never after any demo activity ran.
		idemKey := fmt.Sprintf("demo:topup:%s:from%d:to%d", t.UserID, current, t.Points)
		_, err := walletSvc.Credit(context.Background(), wallet.MutationRequest{
			UserID:         t.UserID,
			AmountPoints:   delta,
			IdempotencyKey: idemKey,
			Reason:         "demo:seed wallet top-up to demo target",
		})
		if err != nil {
			return fmt.Errorf("topup %s by %d pts: %w", t.UserID, delta/100, err)
		}
		fmt.Printf("  topup %-10s  +%-8d pts -> %d pts\n",
			t.UserID, delta/100, t.Points/100)
	}
	return nil
}
