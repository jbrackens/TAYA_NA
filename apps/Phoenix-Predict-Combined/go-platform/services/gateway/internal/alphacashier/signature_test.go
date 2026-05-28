package alphacashier

import (
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
)

func TestVerifyPersonalSignature(t *testing.T) {
	key, err := crypto.HexToECDSA("4c0883a69102937d6231471b5dbb6204fe51296170827944e48f8b7f95b35c5f")
	if err != nil {
		t.Fatalf("private key fixture: %v", err)
	}
	address := crypto.PubkeyToAddress(key.PublicKey).Hex()
	issuedAt := time.Date(2026, 5, 27, 12, 0, 0, 0, time.UTC)
	message := BuildWalletChallengeMessage("u-1", address, 8453, "nonce-1", issuedAt, issuedAt.Add(10*time.Minute))

	sig, err := crypto.Sign(accounts.TextHash([]byte(message)), key)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if err := VerifyPersonalSignature(message, hexutil.Encode(sig), address); err != nil {
		t.Fatalf("VerifyPersonalSignature: %v", err)
	}
}

func TestVerifyPersonalSignatureRejectsWrongAddress(t *testing.T) {
	key, err := crypto.HexToECDSA("4c0883a69102937d6231471b5dbb6204fe51296170827944e48f8b7f95b35c5f")
	if err != nil {
		t.Fatalf("private key fixture: %v", err)
	}
	address := crypto.PubkeyToAddress(key.PublicKey).Hex()
	issuedAt := time.Date(2026, 5, 27, 12, 0, 0, 0, time.UTC)
	message := BuildWalletChallengeMessage("u-1", address, 8453, "nonce-1", issuedAt, issuedAt.Add(10*time.Minute))

	sig, err := crypto.Sign(accounts.TextHash([]byte(message)), key)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if err := VerifyPersonalSignature(message, hexutil.Encode(sig), "0x0000000000000000000000000000000000000009"); err == nil {
		t.Fatalf("expected wrong address to fail")
	}
}
