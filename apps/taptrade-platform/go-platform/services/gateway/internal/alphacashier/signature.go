package alphacashier

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

// defaultChallengeDomain is the origin/domain stamped into the wallet challenge
// so a signature for one application cannot be replayed as a connect on another
// (audit #19). Replaces the legacy literal "TapTrade".
const defaultChallengeDomain = "hula-na"

func NewNonce() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(b[:]), nil
}

// BuildWalletChallengeMessage builds the personal-sign challenge text. domain is
// the binding origin (e.g. "hula-na"); an empty domain falls back to the
// default. NOTE (#19): this is a plain personal_sign message, not EIP-712/SIWE —
// full structured SIWE is out of scope and tracked separately.
func BuildWalletChallengeMessage(domain string, userID string, walletAddress string, chainID int64, nonce string, issuedAt time.Time, expiresAt time.Time) string {
	domain = strings.TrimSpace(domain)
	if domain == "" {
		domain = defaultChallengeDomain
	}
	return fmt.Sprintf(
		"%s\n\nAction: Connect wallet\nUser ID: %s\nWallet: %s\nChain ID: %d\nNonce: %s\nIssued At: %s\nExpires At: %s",
		domain,
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
	// Reject high-S (malleable) signatures per EIP-2 (audit #19): for any valid
	// signature (r,s) there is a complementary (r, N-s) that recovers the same
	// key, so without this check a distinct-looking signature could pass and be
	// replayed. ValidateSignatureValues with homestead=true rejects s > N/2.
	r := new(big.Int).SetBytes(sig[:32])
	sVal := new(big.Int).SetBytes(sig[32:64])
	if !crypto.ValidateSignatureValues(sig[64], r, sVal, true) {
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
