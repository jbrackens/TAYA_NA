package cashier

type RuntimeFlagKey string

const (
	RuntimeFlagTronDepositsEnabled      RuntimeFlagKey = "tron_deposits_enabled"
	RuntimeFlagEVMDepositsEnabled       RuntimeFlagKey = "evm_deposits_enabled"
	RuntimeFlagWithdrawalsEnabled       RuntimeFlagKey = "withdrawals_enabled"
	RuntimeFlagRelayerEnabled           RuntimeFlagKey = "relayer_enabled"
	RuntimeFlagProviderCallbacksEnabled RuntimeFlagKey = "provider_callbacks_enabled"
)

type RuntimeFlag struct {
	Key     RuntimeFlagKey
	Enabled bool
}

func IsRuntimeFlagEnabled(flags []RuntimeFlag, key RuntimeFlagKey) bool {
	if !IsKnownRuntimeFlagKey(key) {
		return false
	}
	for _, flag := range flags {
		if flag.Key == key {
			return flag.Enabled
		}
	}
	return false
}

func IsKnownRuntimeFlagKey(key RuntimeFlagKey) bool {
	switch key {
	case RuntimeFlagTronDepositsEnabled,
		RuntimeFlagEVMDepositsEnabled,
		RuntimeFlagWithdrawalsEnabled,
		RuntimeFlagRelayerEnabled,
		RuntimeFlagProviderCallbacksEnabled:
		return true
	default:
		return false
	}
}
