package cashier

import "testing"

func TestIdempotencyKeysAreDeterministicAndScoped(t *testing.T) {
	if got := DepositIdempotencyKey("relay", "tron", "tx1", 0); got != "deposit:relay:tron:tx1:0" {
		t.Fatalf("deposit idempotency key = %q", got)
	}

	if got := WithdrawalIdempotencyKey("user1", "0xABC", "1000", "0xDEF"); got != "withdrawal:user1:0xabc:1000:0xdef" {
		t.Fatalf("withdrawal idempotency key = %q", got)
	}

	got := RelayerIdempotencyKey(
		"polygon",
		"0x1111111111111111111111111111111111111111",
		"0x2222222222222222222222222222222222222222",
		"ABC",
		"0x3333333333333333333333333333333333333333333333333333333333333333",
	)
	want := "relayer:polygon:0x1111111111111111111111111111111111111111:0x2222222222222222222222222222222222222222:abc:0x3333333333333333333333333333333333333333333333333333333333333333"
	if got != want {
		t.Fatalf("relayer idempotency key = %q, want %q", got, want)
	}
}
