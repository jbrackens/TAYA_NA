package payments

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// mockRPC returns an httptest server that answers each JSON-RPC method with the
// canned raw-JSON result registered for it.
func mockRPC(t *testing.T, results map[string]string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req rpcRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		res, ok := results[req.Method]
		if !ok {
			http.Error(w, "unexpected method "+req.Method, http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":1,"result":` + res + `}`))
	}))
}

func TestEVMClient_ScalarReads(t *testing.T) {
	srv := mockRPC(t, map[string]string{
		"eth_chainId":     `"0x38"`,
		"eth_blockNumber": `"0x100"`,
		"eth_call":        `"0x0000000000000000000000000000000000000000000000000000000000000012"`,
	})
	defer srv.Close()
	c := NewEVMClient(srv.URL)
	ctx := context.Background()

	if id, err := c.ChainID(ctx); err != nil || id != 56 {
		t.Fatalf("ChainID = (%d, %v), want (56, nil)", id, err)
	}
	if bn, err := c.BlockNumber(ctx); err != nil || bn != 256 {
		t.Fatalf("BlockNumber = (%d, %v), want (256, nil)", bn, err)
	}
	if d, err := c.TokenDecimals(ctx, "0x55d398326f99059fF775485246999027B3197955"); err != nil || d != 18 {
		t.Fatalf("TokenDecimals = (%d, %v), want (18, nil)", d, err)
	}
}

func TestEVMClient_GetLogsAndDecode(t *testing.T) {
	// from=0xaaaa…, to=0xbbbb…, amount=1e18 (0x0de0b6b3a7640000; decoder is length-agnostic).
	logJSON := `[{
      "address":"0x55d398326f99059ff775485246999027b3197955",
      "topics":[
        "` + erc20TransferTopic + `",
        "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      ],
      "data":"0x0de0b6b3a7640000",
      "blockNumber":"0x10","blockHash":"0xblk","transactionHash":"0xtx","logIndex":"0x2","removed":false
    }]`
	srv := mockRPC(t, map[string]string{"eth_getLogs": logJSON})
	defer srv.Close()
	c := NewEVMClient(srv.URL)

	logs, err := c.GetLogs(context.Background(), LogFilter{
		FromBlock: 1, ToBlock: 16,
		Address: "0x55d398326f99059fF775485246999027B3197955",
		Topics:  []any{erc20TransferTopic},
	})
	if err != nil {
		t.Fatalf("GetLogs: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("got %d logs, want 1", len(logs))
	}
	l := logs[0]
	if l.BlockNumber != 16 || l.LogIndex != 2 || l.TxHash != "0xtx" || l.BlockHash != "0xblk" || l.Removed {
		t.Fatalf("decoded log fields wrong: %+v", l)
	}

	tr, err := DecodeERC20Transfer(l)
	if err != nil {
		t.Fatalf("DecodeERC20Transfer: %v", err)
	}
	if tr.From != "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" {
		t.Errorf("from = %s", tr.From)
	}
	if tr.To != "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" {
		t.Errorf("to = %s", tr.To)
	}
	if tr.Amount.String() != "1000000000000000000" {
		t.Errorf("amount = %s, want 1000000000000000000", tr.Amount.String())
	}
}

func TestDecodeERC20Transfer_Rejects(t *testing.T) {
	// Wrong topic0.
	if _, err := DecodeERC20Transfer(Log{
		Topics: []string{"0xdeadbeef", "0x00", "0x00"}, Data: "0x01",
	}); err == nil {
		t.Error("expected error for non-Transfer topic0")
	}
	// Too few topics.
	if _, err := DecodeERC20Transfer(Log{
		Topics: []string{erc20TransferTopic}, Data: "0x01",
	}); err == nil {
		t.Error("expected error for too few topics")
	}
}
