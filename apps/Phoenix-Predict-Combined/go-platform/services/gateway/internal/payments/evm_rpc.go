package payments

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// EVMClient is a minimal, read-only JSON-RPC client for EVM chains (BSC). It
// covers only what the deposit watcher needs — chain id, head block, ERC-20
// decimals, and log scans — with no external dependencies. Every method fails
// closed: any transport/RPC error propagates, so the watcher never acts on a
// read it could not verify.
type EVMClient struct {
	url  string
	http *http.Client
}

func NewEVMClient(url string) *EVMClient {
	return &EVMClient{url: url, http: &http.Client{Timeout: 15 * time.Second}}
}

// ChainReader is the slice of EVMClient the deposit watcher depends on, so the
// watcher can be unit-tested against a fake chain.
type ChainReader interface {
	BlockNumber(ctx context.Context) (int64, error)
	GetLogs(ctx context.Context, f LogFilter) ([]Log, error)
}

// erc20TransferTopic is keccak256("Transfer(address,address,uint256)").
const erc20TransferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

// erc20DecimalsSelector is the 4-byte selector for decimals().
const erc20DecimalsSelector = "0x313ce567"

type rpcRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  []any  `json:"params"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type rpcResponse struct {
	Result json.RawMessage `json:"result"`
	Error  *rpcError       `json:"error"`
}

func (c *EVMClient) call(ctx context.Context, method string, params []any) (json.RawMessage, error) {
	body, err := json.Marshal(rpcRequest{JSONRPC: "2.0", ID: 1, Method: method, Params: params})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("rpc http status %d", resp.StatusCode)
	}
	var rr rpcResponse
	if err := json.NewDecoder(resp.Body).Decode(&rr); err != nil {
		return nil, err
	}
	if rr.Error != nil {
		return nil, fmt.Errorf("rpc error %d: %s", rr.Error.Code, rr.Error.Message)
	}
	return rr.Result, nil
}

func (c *EVMClient) ChainID(ctx context.Context) (int64, error) {
	raw, err := c.call(ctx, "eth_chainId", []any{})
	if err != nil {
		return 0, err
	}
	return decodeHexQuantity(raw)
}

func (c *EVMClient) BlockNumber(ctx context.Context) (int64, error) {
	raw, err := c.call(ctx, "eth_blockNumber", []any{})
	if err != nil {
		return 0, err
	}
	return decodeHexQuantity(raw)
}

// TokenDecimals reads decimals() from an ERC-20 contract. The watcher asserts
// this matches the configured token's expected decimals before crediting — the
// 18-vs-6 landmine guard.
func (c *EVMClient) TokenDecimals(ctx context.Context, contract string) (int, error) {
	raw, err := c.call(ctx, "eth_call", []any{
		map[string]string{"to": contract, "data": erc20DecimalsSelector},
		"latest",
	})
	if err != nil {
		return 0, err
	}
	d, err := decodeHexQuantity(raw)
	if err != nil {
		return 0, err
	}
	if d < 0 || d > 36 {
		return 0, fmt.Errorf("implausible token decimals %d", d)
	}
	return int(d), nil
}

// LogFilter is an eth_getLogs filter. Topics elements may be a string (exact),
// a []string (any-of), or nil (wildcard), matching the JSON-RPC shape.
type LogFilter struct {
	FromBlock int64
	ToBlock   int64
	Address   string
	Topics    []any
}

// Log is a decoded eth_getLogs entry. Removed=true means the log's block left
// the canonical chain (a reorg) — the watcher rolls such deposits back.
type Log struct {
	Address     string
	Topics      []string
	Data        string
	BlockNumber int64
	BlockHash   string
	TxHash      string
	LogIndex    int
	Removed     bool
}

func (c *EVMClient) GetLogs(ctx context.Context, f LogFilter) ([]Log, error) {
	param := map[string]any{
		"fromBlock": toHexQuantity(f.FromBlock),
		"toBlock":   toHexQuantity(f.ToBlock),
	}
	if f.Address != "" {
		param["address"] = f.Address
	}
	if len(f.Topics) > 0 {
		param["topics"] = f.Topics
	}
	raw, err := c.call(ctx, "eth_getLogs", []any{param})
	if err != nil {
		return nil, err
	}
	var rawLogs []struct {
		Address     string   `json:"address"`
		Topics      []string `json:"topics"`
		Data        string   `json:"data"`
		BlockNumber string   `json:"blockNumber"`
		BlockHash   string   `json:"blockHash"`
		TxHash      string   `json:"transactionHash"`
		LogIndex    string   `json:"logIndex"`
		Removed     bool     `json:"removed"`
	}
	if err := json.Unmarshal(raw, &rawLogs); err != nil {
		return nil, err
	}
	out := make([]Log, 0, len(rawLogs))
	for _, rl := range rawLogs {
		bn, err := hexToInt64(rl.BlockNumber)
		if err != nil {
			return nil, fmt.Errorf("blockNumber: %w", err)
		}
		li, err := hexToInt64(rl.LogIndex)
		if err != nil {
			return nil, fmt.Errorf("logIndex: %w", err)
		}
		out = append(out, Log{
			Address: rl.Address, Topics: rl.Topics, Data: rl.Data,
			BlockNumber: bn, BlockHash: rl.BlockHash, TxHash: rl.TxHash,
			LogIndex: int(li), Removed: rl.Removed,
		})
	}
	return out, nil
}

// ERC20Transfer is a decoded Transfer event.
type ERC20Transfer struct {
	From   string
	To     string
	Amount *big.Int
}

// DecodeERC20Transfer extracts (from, to, amount) from a Transfer log. Returns
// an error for any log that is not a well-formed Transfer, so the watcher can
// skip non-Transfer noise rather than mis-credit.
func DecodeERC20Transfer(l Log) (ERC20Transfer, error) {
	if len(l.Topics) < 3 {
		return ERC20Transfer{}, fmt.Errorf("transfer log needs 3 topics, got %d", len(l.Topics))
	}
	if !strings.EqualFold(l.Topics[0], erc20TransferTopic) {
		return ERC20Transfer{}, fmt.Errorf("topic0 is not the ERC-20 Transfer signature")
	}
	amount, err := hexToBig(l.Data)
	if err != nil {
		return ERC20Transfer{}, fmt.Errorf("amount: %w", err)
	}
	return ERC20Transfer{
		From:   topicToAddress(l.Topics[1]),
		To:     topicToAddress(l.Topics[2]),
		Amount: amount,
	}, nil
}

// topicToAddress takes the low 20 bytes of a 32-byte topic and returns a
// lowercased 0x address.
func topicToAddress(topic string) string {
	h := strings.TrimPrefix(strings.TrimPrefix(topic, "0x"), "0X")
	if len(h) < 40 {
		return "0x" + strings.ToLower(h)
	}
	return "0x" + strings.ToLower(h[len(h)-40:])
}

// decodeHexQuantity unmarshals a JSON-RPC hex string result ("0x...") to int64.
func decodeHexQuantity(raw json.RawMessage) (int64, error) {
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return 0, err
	}
	return hexToInt64(s)
}

func hexToInt64(s string) (int64, error) {
	s = strings.TrimPrefix(strings.TrimPrefix(s, "0x"), "0X")
	if s == "" {
		return 0, nil
	}
	n, ok := new(big.Int).SetString(s, 16)
	if !ok {
		return 0, fmt.Errorf("invalid hex quantity %q", s)
	}
	if !n.IsInt64() {
		return 0, fmt.Errorf("hex quantity overflows int64: %q", s)
	}
	return n.Int64(), nil
}

func hexToBig(s string) (*big.Int, error) {
	s = strings.TrimPrefix(strings.TrimPrefix(s, "0x"), "0X")
	if s == "" {
		return big.NewInt(0), nil
	}
	n, ok := new(big.Int).SetString(s, 16)
	if !ok {
		return nil, fmt.Errorf("invalid hex %q", s)
	}
	return n, nil
}

func toHexQuantity(n int64) string {
	return "0x" + strconv.FormatInt(n, 16)
}
