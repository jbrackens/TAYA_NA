package service

import "testing"

func TestParseChannel(t *testing.T) {
	tests := []struct {
		name      string
		channel   string
		wantKind  string
		wantID    string
		wantAuth  bool
		shouldErr bool
	}{
		{name: "market", channel: "market^mrk-1", wantKind: "market", wantID: "mrk-1"},
		{name: "fixture", channel: "fixture^esports^fx-1", wantKind: "fixture", wantID: "fx-1"},
		{name: "bets", channel: "bets", wantKind: "bets", wantAuth: true},
		{name: "wallets", channel: "wallets", wantKind: "wallets", wantAuth: true},
		{name: "invalid", channel: "weird", shouldErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			descriptor, err := parseChannel(tt.channel)
			if tt.shouldErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if descriptor.kind != tt.wantKind {
				t.Fatalf("kind = %s, want %s", descriptor.kind, tt.wantKind)
			}
			if descriptor.requiresAuth != tt.wantAuth {
				t.Fatalf("requiresAuth = %v, want %v", descriptor.requiresAuth, tt.wantAuth)
			}
			if tt.wantKind == "market" && descriptor.marketID != tt.wantID {
				t.Fatalf("marketID = %s, want %s", descriptor.marketID, tt.wantID)
			}
			if tt.wantKind == "fixture" && descriptor.fixtureID != tt.wantID {
				t.Fatalf("fixtureID = %s, want %s", descriptor.fixtureID, tt.wantID)
			}
		})
	}
}

func TestMapBetTopicToState(t *testing.T) {
	tests := []struct {
		name    string
		topic   string
		payload map[string]any
		want    string
		ok      bool
	}{
		{name: "placed", topic: "phoenix.bet.placed", payload: map[string]any{}, want: "OPENED", ok: true},
		{name: "settled", topic: "phoenix.bet.settled", payload: map[string]any{"result": "won"}, want: "SETTLED", ok: true},
		{name: "cancelled", topic: "phoenix.bet.settled", payload: map[string]any{"result": "cancelled"}, want: "CANCELLED", ok: true},
		{name: "failed", topic: "phoenix.bet.updated", payload: map[string]any{"status": "failed"}, want: "FAILED", ok: true},
		{name: "ignore", topic: "phoenix.bet.updated", payload: map[string]any{"status": "mystery"}, want: "", ok: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := mapBetTopicToState(tt.topic, tt.payload)
			if ok != tt.ok {
				t.Fatalf("ok = %v, want %v", ok, tt.ok)
			}
			if got != tt.want {
				t.Fatalf("state = %s, want %s", got, tt.want)
			}
		})
	}
}
