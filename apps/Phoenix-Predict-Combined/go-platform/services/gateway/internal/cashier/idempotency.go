package cashier

import (
	"fmt"
	"strings"
)

func DepositIdempotencyKey(provider, chain, txHashOrRequestID string, logIndexOrEvent any) string {
	return strings.Join([]string{
		"deposit",
		provider,
		chain,
		txHashOrRequestID,
		fmt.Sprint(logIndexOrEvent),
	}, ":")
}

func WithdrawalIdempotencyKey(userID, destinationAddress, amountUnits, userAuthorizationHash string) string {
	return strings.Join([]string{
		"withdrawal",
		userID,
		strings.ToLower(destinationAddress),
		amountUnits,
		strings.ToLower(userAuthorizationHash),
	}, ":")
}

func RelayerIdempotencyKey(chain, smartWalletAddress, targetContract, calldataSHA256, userAuthorizationHash string) string {
	return strings.Join([]string{
		"relayer",
		chain,
		strings.ToLower(smartWalletAddress),
		strings.ToLower(targetContract),
		strings.ToLower(calldataSHA256),
		strings.ToLower(userAuthorizationHash),
	}, ":")
}
