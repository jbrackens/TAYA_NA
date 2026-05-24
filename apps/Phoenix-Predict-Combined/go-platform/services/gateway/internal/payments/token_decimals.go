package payments

import (
	"context"
	"fmt"
)

// DecimalsReader is the slice of EVMClient used to verify a token's on-chain
// decimals. *EVMClient satisfies it.
type DecimalsReader interface {
	TokenDecimals(ctx context.Context, contract string) (int, error)
}

// VerifyTokenDecimals fetches decimals() on-chain and fails closed unless it
// equals expected. Wire this into watcher/rail startup so a misconfigured token
// (the BSC-USDT-is-18-not-6 landmine) refuses to run rather than mis-crediting:
// the conversion math is parameterised by decimals, so a wrong value would scale
// every credit by 10^(delta).
func VerifyTokenDecimals(ctx context.Context, reader DecimalsReader, contract string, expected int) error {
	got, err := reader.TokenDecimals(ctx, contract)
	if err != nil {
		return fmt.Errorf("read token decimals for %s: %w", contract, err)
	}
	if got != expected {
		return fmt.Errorf("token %s reports on-chain decimals=%d, expected %d; refusing to run (would mis-credit deposits)", contract, got, expected)
	}
	return nil
}
