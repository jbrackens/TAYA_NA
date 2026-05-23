package payments

import (
	"errors"
	"fmt"
	"math/big"
)

// On-chain stablecoins use their own decimals; the platform ledger uses integer
// US cents (2 decimal places). All conversion between on-chain base units and
// ledger cents happens HERE, at the rail boundary, so the decimals landmine
// lives in exactly one tested place.
//
// BSC USDT (0x55d398326f99059fF775485246999027B3197955) is 18 decimals — NOT 6.
// ERC-20 USDT on Ethereum and TRC-20 USDT on Tron are 6. The bridge converts
// Tron's 6 to BSC's 18; our rail only ever sees the BSC side after the bridge.
const (
	// CentsDecimals is the number of decimal places in a US-cent ledger amount.
	CentsDecimals = 2
	// BSCUSDTDecimals is the on-chain decimals of BSC USDT. 18, not 6.
	BSCUSDTDecimals = 18

	minTokenDecimals = CentsDecimals
	maxTokenDecimals = 36
)

var (
	ErrNilAmount           = errors.New("token amount must not be nil")
	ErrNegativeAmount      = errors.New("token amount must be non-negative")
	ErrNegativeCents       = errors.New("cents must be non-negative")
	ErrUnsupportedDecimals = errors.New("unsupported token decimals")
	ErrCentsOverflow       = errors.New("converted amount overflows int64 cents")
)

// TokenUnitsToCents converts an integer on-chain token amount (base units, where
// 10^decimals base units == 1 whole token) into integer US cents.
//
// It TRUNCATES any sub-cent remainder (it never rounds up): we credit only whole
// cents and return the leftover dust (in base units) so the caller can account
// for it. Rounding up would credit money that was never received.
//
// decimals=18 examples:
//
//	1_000000000000000000 (1.00 USDT)        -> 100 cents, dust 0
//	1_230000000000000000 (1.23 USDT)        -> 123 cents, dust 0
//	1_234999999999999999 (1.2349… USDT)     -> 123 cents, dust 4_999999999999999
//	      9999999999999999 (< 1 cent)        ->   0 cents, dust 9_999999999999999
func TokenUnitsToCents(amount *big.Int, decimals int) (cents int64, dust *big.Int, err error) {
	if amount == nil {
		return 0, nil, ErrNilAmount
	}
	if amount.Sign() < 0 {
		return 0, nil, ErrNegativeAmount
	}
	if decimals < minTokenDecimals || decimals > maxTokenDecimals {
		return 0, nil, fmt.Errorf("%w: %d (supported %d..%d)", ErrUnsupportedDecimals, decimals, minTokenDecimals, maxTokenDecimals)
	}

	// baseUnitsPerCent = 10^(decimals - CentsDecimals)
	divisor := pow10(decimals - CentsDecimals)
	q := new(big.Int)
	r := new(big.Int)
	// amount >= 0 and divisor > 0, so QuoRem gives floor division with a
	// non-negative remainder — exactly the truncation we want.
	q.QuoRem(amount, divisor, r)

	if !q.IsInt64() {
		return 0, nil, fmt.Errorf("%w: %s", ErrCentsOverflow, q.String())
	}
	return q.Int64(), r, nil
}

// CentsToTokenUnits converts integer US cents into integer on-chain token base
// units. Cents are coarser than 6/18-decimal tokens, so this is exact — there is
// no dust on the way out.
func CentsToTokenUnits(cents int64, decimals int) (*big.Int, error) {
	if cents < 0 {
		return nil, ErrNegativeCents
	}
	if decimals < minTokenDecimals || decimals > maxTokenDecimals {
		return nil, fmt.Errorf("%w: %d (supported %d..%d)", ErrUnsupportedDecimals, decimals, minTokenDecimals, maxTokenDecimals)
	}
	multiplier := pow10(decimals - CentsDecimals)
	out := big.NewInt(cents)
	return out.Mul(out, multiplier), nil
}

// BSCUSDTToCents is TokenUnitsToCents fixed to BSC USDT's 18 decimals.
func BSCUSDTToCents(amount *big.Int) (cents int64, dust *big.Int, err error) {
	return TokenUnitsToCents(amount, BSCUSDTDecimals)
}

// CentsToBSCUSDT is CentsToTokenUnits fixed to BSC USDT's 18 decimals.
func CentsToBSCUSDT(cents int64) (*big.Int, error) {
	return CentsToTokenUnits(cents, BSCUSDTDecimals)
}

// pow10 returns 10^n as a *big.Int for n >= 0.
func pow10(n int) *big.Int {
	return new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(n)), nil)
}
