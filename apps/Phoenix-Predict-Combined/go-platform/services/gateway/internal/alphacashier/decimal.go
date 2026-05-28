package alphacashier

import (
	"fmt"
	"math/big"
)

func CentsToTokenUnits(cents int64, tokenDecimals int) (*big.Int, error) {
	if cents <= 0 {
		return nil, ErrInvalidAmount
	}
	if tokenDecimals < 2 || tokenDecimals > 30 {
		return nil, fmt.Errorf("token decimals must be between 2 and 30")
	}
	scale := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(tokenDecimals)), nil)
	if new(big.Int).Mod(scale, big.NewInt(100)).Sign() != 0 {
		return nil, fmt.Errorf("token decimals cannot exactly represent cents")
	}
	unitsPerCent := new(big.Int).Div(scale, big.NewInt(100))
	return new(big.Int).Mul(big.NewInt(cents), unitsPerCent), nil
}

func TokenUnitsToCents(units *big.Int, tokenDecimals int) (int64, error) {
	if units == nil || units.Sign() < 0 {
		return 0, ErrInvalidAmount
	}
	if tokenDecimals < 2 || tokenDecimals > 30 {
		return 0, fmt.Errorf("token decimals must be between 2 and 30")
	}
	scale := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(tokenDecimals)), nil)
	if new(big.Int).Mod(scale, big.NewInt(100)).Sign() != 0 {
		return 0, fmt.Errorf("token decimals cannot exactly represent cents")
	}
	unitsPerCent := new(big.Int).Div(scale, big.NewInt(100))
	cents := new(big.Int).Div(new(big.Int).Set(units), unitsPerCent)
	if !cents.IsInt64() {
		return 0, ErrInvalidAmount
	}
	return cents.Int64(), nil
}
