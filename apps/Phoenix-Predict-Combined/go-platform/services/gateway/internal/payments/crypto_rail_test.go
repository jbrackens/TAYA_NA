package payments

import (
	"context"
	"errors"
	"testing"
)

func TestCryptoRail_UnconfiguredFailsClosed(t *testing.T) {
	t.Setenv("CRYPTO_RPC_URL", "")
	t.Setenv("CRYPTO_ASSET_CONTRACT", "")
	t.Setenv("CRYPTO_DEPOSIT_ADDRESS_SOURCE", "")
	rail := NewCryptoRailFromEnv(nil)
	if rail.Configured() {
		t.Fatal("rail must report unconfigured when chain env is unset")
	}
	if _, err := rail.DepositAddress(context.Background(), "u-1"); !errors.Is(err, ErrRailNotConfigured) {
		t.Fatalf("DepositAddress must fail closed when unconfigured, got %v", err)
	}
	if _, err := rail.PrepareWithdrawal(context.Background(), "u-1", "0xabc", 100); !errors.Is(err, ErrRailNotConfigured) {
		t.Fatalf("PrepareWithdrawal must fail closed when unconfigured, got %v", err)
	}
}

func TestCryptoRail_DefaultsAndConfiguredFlag(t *testing.T) {
	t.Setenv("CRYPTO_NETWORK", "")
	t.Setenv("CRYPTO_ASSET", "")
	t.Setenv("CRYPTO_CONFIRMATIONS", "6")
	t.Setenv("CRYPTO_RPC_URL", "https://rpc.example")
	t.Setenv("CRYPTO_ASSET_CONTRACT", "0xUSDC")
	t.Setenv("CRYPTO_DEPOSIT_ADDRESS_SOURCE", "xpub-test")
	rail := NewCryptoRailFromEnv(nil)
	if rail.Network() != "base" || rail.Asset() != "USDC" {
		t.Fatalf("defaults wrong: network=%q asset=%q", rail.Network(), rail.Asset())
	}
	if rail.Confirmations() != 6 {
		t.Fatalf("confirmations = %d, want 6", rail.Confirmations())
	}
	if !rail.Configured() {
		t.Fatal("rail should be configured when all chain inputs are set")
	}
}
