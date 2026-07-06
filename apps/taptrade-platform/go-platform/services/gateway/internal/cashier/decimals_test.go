package cashier

import "testing"

func TestValidateDecimalSpecAcceptsKnownRails(t *testing.T) {
	for _, spec := range []DecimalSpec{
		{ChainKind: "tron", Chain: "tron", Asset: "USDT", Decimals: 6},
		{ChainKind: "evm", Chain: "bsc", Asset: "USDT", Decimals: 18},
		{ChainKind: "evm", Chain: "polygon", Asset: "USDC", Decimals: 6},
		{ChainKind: "evm", Chain: "settlement", Asset: "hUSD", Decimals: 6},
	} {
		if err := ValidateDecimalSpec(spec); err != nil {
			t.Fatalf("ValidateDecimalSpec(%+v) returned error: %v", spec, err)
		}
	}
}

func TestValidateDecimalSpecRejectsAmbiguousUSDTDecimals(t *testing.T) {
	if err := ValidateDecimalSpec(DecimalSpec{
		ChainKind: "evm",
		Chain:     "bsc",
		Asset:     "USDT",
		Decimals:  6,
	}); err == nil {
		t.Fatalf("expected BSC USDT with 6 decimals to be rejected")
	}

	if err := ValidateDecimalSpec(DecimalSpec{
		ChainKind: "tron",
		Chain:     "tron",
		Asset:     "USDT",
		Decimals:  18,
	}); err == nil {
		t.Fatalf("expected Tron USDT with 18 decimals to be rejected")
	}
}
