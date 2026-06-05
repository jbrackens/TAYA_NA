package alphacashier

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

func NewNonce() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(b[:]), nil
}

func BuildWalletChallengeMessage(userID string, walletAddress string, chainID int64, nonce string, issuedAt time.Time, expiresAt time.Time) string {
	return fmt.Sprintf(
		"Tiangge\n\nAction: Connect wallet\nUser ID: %s\nWallet: %s\nChain ID: %d\nNonce: %s\nIssued At: %s\nExpires At: %s",
		userID,
		common.HexToAddress(walletAddress).Hex(),
		chainID,
		nonce,
		issuedAt.UTC().Format(time.RFC3339),
		expiresAt.UTC().Format(time.RFC3339),
	)
}

func VerifyPersonalSignature(message string, signatureHex string, expectedAddress string) error {
	if !common.IsHexAddress(expectedAddress) {
		return ErrInvalidAddress
	}
	sig := common.FromHex(strings.TrimSpace(signatureHex))
	if len(sig) != 65 {
		return ErrSignatureInvalid
	}
	if sig[64] == 27 || sig[64] == 28 {
		sig[64] -= 27
	}
	if sig[64] != 0 && sig[64] != 1 {
		return ErrSignatureInvalid
	}
	pub, err := crypto.SigToPub(accounts.TextHash([]byte(message)), sig)
	if err != nil {
		return ErrSignatureInvalid
	}
	recovered := crypto.PubkeyToAddress(*pub)
	if !strings.EqualFold(recovered.Hex(), common.HexToAddress(expectedAddress).Hex()) {
		return ErrSignatureInvalid
	}
	return nil
}
