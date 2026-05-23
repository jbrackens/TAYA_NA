package payments

import (
	"errors"
	"math/big"
	"testing"
)

func bigFromString(t *testing.T, s string) *big.Int {
	t.Helper()
	n, ok := new(big.Int).SetString(s, 10)
	if !ok {
		t.Fatalf("invalid big.Int literal %q", s)
	}
	return n
}

func TestTokenUnitsToCents(t *testing.T) {
	cases := []struct {
		name      string
		amount    string
		decimals  int
		wantCents int64
		wantDust  string
		wantErr   error
	}{
		// BSC USDT (18 decimals)
		{"18dec one usdt", "1000000000000000000", 18, 100, "0", nil},
		{"18dec 1.23 usdt", "1230000000000000000", 18, 123, "0", nil},
		{"18dec sub-cent dust", "1234999999999999999", 18, 123, "4999999999999999", nil},
		{"18dec exactly one cent", "10000000000000000", 18, 1, "0", nil},
		{"18dec under one cent", "9999999999999999", 18, 0, "9999999999999999", nil},
		{"18dec zero", "0", 18, 0, "0", nil},
		{"18dec hundred usdt", "100000000000000000000", 18, 10000, "0", nil},
		// USDC / Tron USDT (6 decimals) — proves the helper generalizes
		{"6dec one token", "1000000", 6, 100, "0", nil},
		{"6dec 1.23", "1230000", 6, 123, "0", nil},
		{"6dec sub-cent dust", "1234567", 6, 123, "4567", nil},
		// Cents themselves (2 decimals): identity
		{"2dec identity", "12345", 2, 12345, "0", nil},
		// Errors
		{"negative", "-1", 18, 0, "", ErrNegativeAmount},
		{"bad decimals", "1000000", 1, 0, "", ErrUnsupportedDecimals},
		// (MaxInt64 + 1) cents worth of 18-dec base units -> overflow
		{"overflow", "92233720368547758080000000000000000", 18, 0, "", ErrCentsOverflow},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			cents, dust, err := TokenUnitsToCents(bigFromString(t, tc.amount), tc.decimals)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("err = %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected err: %v", err)
			}
			if cents != tc.wantCents {
				t.Errorf("cents = %d, want %d", cents, tc.wantCents)
			}
			if dust.Cmp(bigFromString(t, tc.wantDust)) != 0 {
				t.Errorf("dust = %s, want %s", dust.String(), tc.wantDust)
			}
		})
	}
}

func TestTokenUnitsToCentsNil(t *testing.T) {
	if _, _, err := TokenUnitsToCents(nil, 18); !errors.Is(err, ErrNilAmount) {
		t.Fatalf("err = %v, want ErrNilAmount", err)
	}
}

func TestCentsToTokenUnits(t *testing.T) {
	cases := []struct {
		name     string
		cents    int64
		decimals int
		want     string
		wantErr  error
	}{
		{"18dec one dollar", 100, 18, "1000000000000000000", nil},
		{"18dec 1.23", 123, 18, "1230000000000000000", nil},
		{"18dec zero", 0, 18, "0", nil},
		{"6dec one dollar", 100, 6, "1000000", nil},
		{"6dec 1.23", 123, 6, "1230000", nil},
		{"negative cents", -1, 18, "", ErrNegativeCents},
		{"bad decimals", 100, 1, "", ErrUnsupportedDecimals},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := CentsToTokenUnits(tc.cents, tc.decimals)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("err = %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected err: %v", err)
			}
			if got.Cmp(bigFromString(t, tc.want)) != 0 {
				t.Errorf("got %s, want %s", got.String(), tc.want)
			}
		})
	}
}

// Round-trip: cents -> base units -> cents is lossless (no dust), since cents are
// coarser than 6/18-decimal tokens.
func TestConversionRoundTrip(t *testing.T) {
	for _, decimals := range []int{6, 18} {
		for _, cents := range []int64{0, 1, 99, 100, 12345, 5000000, 9223372036854} {
			units, err := CentsToTokenUnits(cents, decimals)
			if err != nil {
				t.Fatalf("CentsToTokenUnits(%d,%d): %v", cents, decimals, err)
			}
			back, dust, err := TokenUnitsToCents(units, decimals)
			if err != nil {
				t.Fatalf("TokenUnitsToCents back(%d,%d): %v", cents, decimals, err)
			}
			if back != cents {
				t.Errorf("round-trip cents=%d dec=%d -> %d", cents, decimals, back)
			}
			if dust.Sign() != 0 {
				t.Errorf("round-trip cents=%d dec=%d produced dust %s", cents, decimals, dust.String())
			}
		}
	}
}

// Convenience wrappers stay pinned to BSC USDT's 18 decimals.
func TestBSCUSDTHelpers(t *testing.T) {
	cents, dust, err := BSCUSDTToCents(bigFromString(t, "5000000000000000000")) // 5.00 USDT
	if err != nil || cents != 500 || dust.Sign() != 0 {
		t.Fatalf("BSCUSDTToCents = (%d, %s, %v), want (500, 0, nil)", cents, dust, err)
	}
	units, err := CentsToBSCUSDT(500)
	if err != nil || units.Cmp(bigFromString(t, "5000000000000000000")) != 0 {
		t.Fatalf("CentsToBSCUSDT = (%s, %v), want 5e18", units, err)
	}
}
