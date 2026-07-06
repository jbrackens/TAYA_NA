package cashier

import "testing"

func TestRuntimeFlagsFailClosed(t *testing.T) {
	if IsRuntimeFlagEnabled(nil, RuntimeFlagTronDepositsEnabled) {
		t.Fatalf("missing tron deposits flag must fail closed")
	}
	if IsRuntimeFlagEnabled(
		[]RuntimeFlag{{Key: RuntimeFlagRelayerEnabled, Enabled: true}},
		RuntimeFlagProviderCallbacksEnabled,
	) {
		t.Fatalf("unrelated enabled flag must not enable provider callbacks")
	}
	if IsRuntimeFlagEnabled(
		[]RuntimeFlag{{Key: RuntimeFlagKey("legacy_crypto_deposits_enabled"), Enabled: true}},
		RuntimeFlagKey("legacy_crypto_deposits_enabled"),
	) {
		t.Fatalf("unknown runtime flag must fail closed")
	}
}

func TestRuntimeFlagsReturnExplicitEnablement(t *testing.T) {
	if !IsRuntimeFlagEnabled(
		[]RuntimeFlag{{Key: RuntimeFlagRelayerEnabled, Enabled: true}},
		RuntimeFlagRelayerEnabled,
	) {
		t.Fatalf("explicit enabled relayer flag should be enabled")
	}
	if IsRuntimeFlagEnabled(
		[]RuntimeFlag{{Key: RuntimeFlagWithdrawalsEnabled, Enabled: false}},
		RuntimeFlagWithdrawalsEnabled,
	) {
		t.Fatalf("explicit disabled withdrawals flag should be disabled")
	}
}
