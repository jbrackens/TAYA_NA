package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/wallet"
)

const fallbackDemoDailyClaimCents int64 = 2500

func RunPhase5RewardHistory(ctx context.Context, db *sql.DB, walletSvc *wallet.Service, now time.Time) (int, error) {
	if walletSvc == nil {
		return 0, fmt.Errorf("wallet service is required")
	}
	today := now.UTC().Truncate(24 * time.Hour)
	dates := []time.Time{
		today.AddDate(0, 0, -2),
		today.AddDate(0, 0, -1),
	}
	amount := demoDailyClaimCents()
	for _, date := range dates {
		key := fmt.Sprintf("daily_claim:%s:%s", demoUserID, date.Format("2006-01-02"))
		if _, err := walletSvc.Credit(ctx, wallet.MutationRequest{
			UserID:         demoUserID,
			AmountCents:    amount,
			IdempotencyKey: key,
			Reason:         "daily_claim",
		}); err != nil {
			return 0, fmt.Errorf("seed historical daily claim %s: %w", key, err)
		}
		if db != nil {
			claimTime := time.Date(date.Year(), date.Month(), date.Day(), 12, 0, 0, 0, time.UTC)
			if _, err := db.ExecContext(ctx, `
UPDATE wallet_ledger
SET transaction_time = $1
WHERE user_id = $2
  AND entry_type = 'credit'
  AND idempotency_key = $3`,
				claimTime, demoUserID, key); err != nil {
				return 0, fmt.Errorf("backdate historical daily claim %s: %w", key, err)
			}
		}
	}
	return len(dates), nil
}

func demoDailyClaimCents() int64 {
	raw := strings.TrimSpace(os.Getenv("DAILY_CLAIM_CENTS"))
	if raw == "" {
		return fallbackDemoDailyClaimCents
	}
	n, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || n <= 0 {
		return fallbackDemoDailyClaimCents
	}
	return n
}
