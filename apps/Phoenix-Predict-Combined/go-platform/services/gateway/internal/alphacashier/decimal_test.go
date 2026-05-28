package alphacashier

import (
	"math/big"
	"testing"
)

func TestCentsToTokenUnitsUSDC(t *testing.T) {
	got, err := CentsToTokenUnits(2500, 6)
	if err != nil {
		t.Fatalf("CentsToTokenUnits: %v", err)
	}
	if got.String() != "25000000" {
		t.Fatalf("got %s, want 25000000", got.String())
	}
}

func TestCentsToTokenUnitsRejectsInvalidAmount(t *testing.T) {
	if _, err := CentsToTokenUnits(0, 6); err == nil {
		t.Fatalf("expected invalid amount")
	}
}

func TestTokenUnitsToCentsUSDC(t *testing.T) {
	got, err := TokenUnitsToCents(big.NewInt(25000000), 6)
	if err != nil {
		t.Fatalf("TokenUnitsToCents: %v", err)
	}
	if got != 2500 {
		t.Fatalf("got %d, want 2500", got)
	}
}
