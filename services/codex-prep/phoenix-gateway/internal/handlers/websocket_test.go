package handlers

import (
	"net/http"
	"testing"
)

func TestParseSportsbookWSChannel(t *testing.T) {
	tests := []struct {
		name        string
		channel     string
		wantKind    string
		wantFixture string
		wantMarket  string
		wantAuth    bool
		expectErr   bool
	}{
		{name: "market", channel: "market^mrk_123", wantKind: "market", wantMarket: "mrk_123"},
		{name: "fixture", channel: "fixture^esports^fx_123", wantKind: "fixture", wantFixture: "fx_123"},
		{name: "bets", channel: "bets", wantKind: "bets", wantAuth: true},
		{name: "wallets", channel: "wallets", wantKind: "wallets", wantAuth: true},
		{name: "invalid", channel: "unknown", expectErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			channel, err := parseSportsbookWSChannel(tt.channel)
			if tt.expectErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if channel.kind != tt.wantKind {
				t.Fatalf("kind = %s, want %s", channel.kind, tt.wantKind)
			}
			if channel.marketID != tt.wantMarket {
				t.Fatalf("marketID = %s, want %s", channel.marketID, tt.wantMarket)
			}
			if channel.fixtureID != tt.wantFixture {
				t.Fatalf("fixtureID = %s, want %s", channel.fixtureID, tt.wantFixture)
			}
			if channel.requiresAuth != tt.wantAuth {
				t.Fatalf("requiresAuth = %v, want %v", channel.requiresAuth, tt.wantAuth)
			}
		})
	}
}

func TestMapBetStatusToWSState(t *testing.T) {
	tests := []struct {
		status   string
		expected string
		ok       bool
	}{
		{status: "pending", expected: "OPENED", ok: true},
		{status: "won", expected: "SETTLED", ok: true},
		{status: "cancelled", expected: "CANCELLED", ok: true},
		{status: "failed", expected: "FAILED", ok: true},
		{status: "mystery", expected: "", ok: false},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			state, ok := mapBetStatusToWSState(tt.status)
			if ok != tt.ok {
				t.Fatalf("ok = %v, want %v", ok, tt.ok)
			}
			if state != tt.expected {
				t.Fatalf("state = %s, want %s", state, tt.expected)
			}
		})
	}
}

func TestMapFixtureStatus(t *testing.T) {
	tests := []struct {
		status   string
		expected string
	}{
		{status: "live", expected: "IN_PLAY"},
		{status: "scheduled", expected: "PRE_GAME"},
		{status: "completed", expected: "POST_GAME"},
		{status: "cancelled", expected: "GAME_ABANDONED"},
		{status: "break", expected: "BREAK_IN_PLAY"},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			if actual := mapFixtureStatus(tt.status); actual != tt.expected {
				t.Fatalf("status = %s, want %s", actual, tt.expected)
			}
		})
	}
}

func TestWebsocketOriginChecker(t *testing.T) {
	t.Run("allows configured origin", func(t *testing.T) {
		check := websocketOriginChecker([]string{"https://player.demo.example", "https://talon.demo.example"}, "demo")
		req := testRequestWithOrigin("https://player.demo.example", "gateway.demo.example", "")
		if !check(req) {
			t.Fatal("expected configured origin to be allowed")
		}
	})

	t.Run("blocks unknown configured origin", func(t *testing.T) {
		check := websocketOriginChecker([]string{"https://player.demo.example"}, "demo")
		req := testRequestWithOrigin("https://attacker.example", "gateway.demo.example", "")
		if check(req) {
			t.Fatal("expected unknown origin to be blocked")
		}
	})

	t.Run("allows same origin when not configured", func(t *testing.T) {
		check := websocketOriginChecker(nil, "demo")
		req := testRequestWithOrigin("https://gateway.demo.example", "gateway.demo.example", "https")
		if !check(req) {
			t.Fatal("expected same origin request to be allowed")
		}
	})

	t.Run("allows any origin in development fallback", func(t *testing.T) {
		check := websocketOriginChecker(nil, "development")
		req := testRequestWithOrigin("https://random.example", "gateway.demo.example", "https")
		if !check(req) {
			t.Fatal("expected development fallback to allow any origin")
		}
	})

	t.Run("allows no-origin requests", func(t *testing.T) {
		check := websocketOriginChecker(nil, "demo")
		req := testRequestWithOrigin("", "gateway.demo.example", "")
		if !check(req) {
			t.Fatal("expected no-origin request to be allowed")
		}
	})
}

func TestBuildRealtimeWebSocketURL(t *testing.T) {
	tests := []struct {
		name     string
		baseURL  string
		rawQuery string
		want     string
		wantErr  bool
	}{
		{name: "http base", baseURL: "http://phoenix-realtime:8018", rawQuery: "foo=bar", want: "ws://phoenix-realtime:8018/api/v1/ws/web-socket?foo=bar"},
		{name: "https base", baseURL: "https://realtime.demo.example", want: "wss://realtime.demo.example/api/v1/ws/web-socket"},
		{name: "invalid scheme", baseURL: "ftp://realtime.demo.example", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := buildRealtimeWebSocketURL(tt.baseURL, tt.rawQuery)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("url = %s, want %s", got, tt.want)
			}
		})
	}
}

func testRequestWithOrigin(origin, host, forwardedProto string) *http.Request {
	req, _ := http.NewRequest(http.MethodGet, "http://"+host+"/api/v1/ws/web-socket", nil)
	req.Host = host
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	if forwardedProto != "" {
		req.Header.Set("X-Forwarded-Proto", forwardedProto)
	}
	return req
}
