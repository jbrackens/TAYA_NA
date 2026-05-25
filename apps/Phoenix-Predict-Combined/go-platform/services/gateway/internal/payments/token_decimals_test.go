package payments

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestVerifyTokenDecimals(t *testing.T) {
	// decimals() == 18 (0x12)
	srv := mockRPC(t, map[string]string{
		"eth_call": `"0x0000000000000000000000000000000000000000000000000000000000000012"`,
	})
	defer srv.Close()
	c := NewEVMClient(srv.URL)
	ctx := context.Background()

	if err := VerifyTokenDecimals(ctx, c, "0x55d398326f99059fF775485246999027B3197955", 18); err != nil {
		t.Fatalf("matching decimals should pass, got %v", err)
	}
	if err := VerifyTokenDecimals(ctx, c, "0x55d398326f99059fF775485246999027B3197955", 6); err == nil {
		t.Fatal("mismatched decimals must fail closed")
	}
}

func TestVerifyTokenDecimals_RPCErrorFailsClosed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer srv.Close()
	c := NewEVMClient(srv.URL)
	if err := VerifyTokenDecimals(context.Background(), c, "0xUSDT", 18); err == nil {
		t.Fatal("an RPC error must fail closed, not pass")
	}
}
