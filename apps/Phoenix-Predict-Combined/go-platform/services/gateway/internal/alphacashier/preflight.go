package alphacashier

import (
	"context"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
)

const (
	preflightPass = "pass"
	preflightWarn = "warn"
	preflightFail = "fail"

	stage1SuggestedMaxDepositCents = int64(25000)
	stage1SuggestedDailyLimitCents = int64(100000)
)

func (s *Service) Preflight(ctx context.Context) PreflightReport {
	cfg := s.cfg
	report := PreflightReport{
		Overall:            preflightPass,
		Enabled:            cfg.Enabled,
		ChainID:            cfg.ChainID,
		ChainName:          cfg.ChainName,
		TokenSymbol:        cfg.TokenSymbol,
		TokenAddress:       cfg.TokenAddress,
		TreasuryAddress:    cfg.TreasuryAddress,
		WithdrawalsEnabled: cfg.WithdrawalsEnabled,
		GeneratedAt:        s.now().UTC(),
	}
	add := func(key, status, message string, metadata map[string]any) {
		report.Checks = append(report.Checks, PreflightCheck{
			Key:      key,
			Status:   status,
			Message:  message,
			Metadata: metadata,
		})
		switch {
		case status == preflightFail:
			report.Overall = preflightFail
		case status == preflightWarn && report.Overall != preflightFail:
			report.Overall = preflightWarn
		}
	}

	if cfg.Enabled {
		add("config.enabled", preflightPass, "alpha cashier is enabled", nil)
		if err := cfg.Validate(); err != nil {
			add("config.required", preflightFail, err.Error(), nil)
		} else {
			add("config.required", preflightPass, "required chain, token, treasury, and RPC config is present", nil)
		}
	} else {
		add("config.enabled", preflightWarn, "alpha cashier is disabled; keep this state until live-chain setup and smoke tests pass", nil)
		add("config.required", preflightWarn, "required live-chain config is not enforced while disabled", nil)
	}

	if common.IsHexAddress(cfg.TokenAddress) {
		add("token.address", preflightPass, "token address is a valid EVM address", map[string]any{"tokenAddress": common.HexToAddress(cfg.TokenAddress).Hex()})
	} else {
		add("token.address", statusForEnabled(cfg.Enabled), "token address is not a valid EVM address", map[string]any{"field": "ALPHA_CASHIER_TOKEN_ADDRESS"})
	}
	if common.IsHexAddress(cfg.TreasuryAddress) {
		add("treasury.address", preflightPass, "treasury address is a valid EVM address", map[string]any{"treasuryAddress": common.HexToAddress(cfg.TreasuryAddress).Hex()})
	} else {
		add("treasury.address", statusForEnabled(cfg.Enabled), "treasury address is not a valid EVM address", map[string]any{"field": "ALPHA_CASHIER_TREASURY_ADDRESS"})
	}
	if common.IsHexAddress(cfg.TokenAddress) && common.IsHexAddress(cfg.TreasuryAddress) {
		token := common.HexToAddress(cfg.TokenAddress)
		treasury := common.HexToAddress(cfg.TreasuryAddress)
		switch {
		case token == (common.Address{}):
			add("token.zero_address", preflightFail, "token address must not be the zero address", nil)
		case treasury == (common.Address{}):
			add("treasury.zero_address", preflightFail, "treasury address must not be the zero address", nil)
		case token == treasury:
			add("treasury.token_distinct", preflightFail, "treasury address must be different from the token contract address", nil)
		default:
			add("treasury.token_distinct", preflightPass, "treasury and token addresses are distinct", nil)
		}
	}

	switch {
	case cfg.MinDepositCents <= 0 || cfg.MaxDepositCents < cfg.MinDepositCents || cfg.DailyDepositLimitCents < cfg.MaxDepositCents:
		add("limits.valid", statusForEnabled(cfg.Enabled), "deposit limits are internally inconsistent", map[string]any{
			"minDepositCents":        cfg.MinDepositCents,
			"maxDepositCents":        cfg.MaxDepositCents,
			"dailyDepositLimitCents": cfg.DailyDepositLimitCents,
		})
	default:
		add("limits.valid", preflightPass, "deposit limits are internally consistent", map[string]any{
			"minDepositCents":        cfg.MinDepositCents,
			"maxDepositCents":        cfg.MaxDepositCents,
			"dailyDepositLimitCents": cfg.DailyDepositLimitCents,
		})
	}
	if cfg.MaxDepositCents > stage1SuggestedMaxDepositCents || cfg.DailyDepositLimitCents > stage1SuggestedDailyLimitCents {
		add("limits.stage1_low_limits", preflightWarn, "limits exceed the documented Stage 1 defaults; confirm this is intentional before enabling a cohort", map[string]any{
			"stage1MaxDepositCents":        stage1SuggestedMaxDepositCents,
			"stage1DailyDepositLimitCents": stage1SuggestedDailyLimitCents,
		})
	} else {
		add("limits.stage1_low_limits", preflightPass, "limits are within the documented Stage 1 defaults", nil)
	}

	if cfg.WithdrawalReviewNeeded {
		add("withdrawals.review_required", preflightPass, "withdrawal review is required", nil)
	} else {
		add("withdrawals.review_required", statusForEnabled(cfg.Enabled), "withdrawal review must remain required for Stage 1", nil)
	}
	if cfg.WithdrawalsEnabled {
		add("withdrawals.queue", preflightWarn, "withdrawal request queue is enabled; payouts must still be broadcast manually outside the app", nil)
	} else {
		add("withdrawals.queue", preflightPass, "withdrawal request queue is disabled", nil)
	}

	if s.ledger == nil {
		add("wallet_ledger", statusForEnabled(cfg.Enabled), "wallet ledger is not wired; money movement will fail closed", nil)
	} else {
		add("wallet_ledger", preflightPass, "wallet ledger is wired", nil)
	}

	if !cfg.Enabled {
		add("evm_rpc", preflightWarn, "RPC connectivity is not checked while the cashier is disabled", nil)
		return report
	}
	if s.evmClient == nil {
		add("evm_rpc", preflightFail, "EVM RPC client is unavailable; tx submission will fail closed", nil)
		return report
	}

	rpcCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	latest, err := s.evmClient.BlockNumber(rpcCtx)
	if err != nil {
		add("evm_rpc.block_number", preflightFail, "RPC block number check failed", map[string]any{"error": err.Error()})
	} else {
		add("evm_rpc.block_number", preflightPass, "RPC block number check passed", map[string]any{"latestBlock": latest})
	}
	if common.IsHexAddress(cfg.TokenAddress) && common.IsHexAddress(cfg.TreasuryAddress) {
		balance, err := s.evmClient.TokenBalance(rpcCtx, common.HexToAddress(cfg.TokenAddress), common.HexToAddress(cfg.TreasuryAddress))
		if err != nil {
			add("treasury.balance", preflightFail, "treasury token balance check failed", map[string]any{"error": err.Error()})
		} else {
			cents, _ := TokenUnitsToCents(balance, cfg.TokenDecimals)
			add("treasury.balance", preflightPass, "treasury token balance check passed", map[string]any{
				"balanceUnits": balance.String(),
				"balanceCents": cents,
			})
		}
	}
	return report
}

func statusForEnabled(enabled bool) string {
	if enabled {
		return preflightFail
	}
	return preflightWarn
}

func (c PreflightCheck) IsFailure() bool {
	return strings.EqualFold(c.Status, preflightFail)
}
