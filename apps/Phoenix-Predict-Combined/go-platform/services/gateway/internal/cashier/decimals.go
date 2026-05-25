package cashier

import "fmt"

type DecimalSpec struct {
	ChainKind string
	Chain     string
	Asset     string
	Decimals  int
}

var knownDecimalSpecs = []DecimalSpec{
	{ChainKind: "tron", Chain: "tron", Asset: "USDT", Decimals: 6},
	{ChainKind: "evm", Chain: "bsc", Asset: "USDT", Decimals: 18},
	{ChainKind: "evm", Chain: "polygon", Asset: "USDC", Decimals: 6},
	{ChainKind: "evm", Chain: "settlement", Asset: "hUSD", Decimals: 6},
}

func IsKnownDecimalSpec(spec DecimalSpec) bool {
	for _, candidate := range knownDecimalSpecs {
		if candidate == spec {
			return true
		}
	}
	return false
}

func ValidateDecimalSpec(spec DecimalSpec) error {
	if IsKnownDecimalSpec(spec) {
		return nil
	}
	return fmt.Errorf("unknown decimal spec %s:%s:%s:%d", spec.ChainKind, spec.Chain, spec.Asset, spec.Decimals)
}
