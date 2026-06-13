package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/phoenixbot/phoenix-gateway/internal/config"
	"github.com/phoenixbot/phoenix-gateway/internal/middleware"
	"github.com/phoenixbot/phoenix-gateway/internal/repository"
	"github.com/phoenixbot/phoenix-gateway/internal/service"
)

func TestResolveChatRoomDisabled(t *testing.T) {
	h := newChatTestHandlers(config.ChatConfig{Enabled: false})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/chat/rooms/resolve", nil)
	rec := httptest.NewRecorder()

	h.ResolveChatRoom(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	var body chatRoomResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Enabled {
		t.Fatalf("expected disabled chat response")
	}
}

func TestResolveChatRoomEnabled(t *testing.T) {
	h := newChatTestHandlers(config.ChatConfig{
		Enabled:                  true,
		Provider:                 "rocketchat",
		PublicURL:                "https://chat.hulana.com",
		InternalURL:              "http://rocketchat:3000",
		DefaultRoom:              "global",
		IframePath:               "/channel/%s?layout=embedded",
		RocketChatAdminUserID:    "admin-id",
		RocketChatAdminAuthToken: "admin-token",
		SessionTokenTTL:          time.Hour,
	})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/chat/rooms/resolve", nil)
	rec := httptest.NewRecorder()

	h.ResolveChatRoom(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	var body chatRoomResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !body.Enabled || body.Room == nil || body.Room.ID != "global" {
		t.Fatalf("unexpected room response: %+v", body)
	}
	if body.EmbedURL != "https://chat.hulana.com/channel/global?layout=embedded" {
		t.Fatalf("unexpected embed url: %s", body.EmbedURL)
	}
}

func newChatTestHandlers(chat config.ChatConfig) *Handlers {
	cfg := &config.Config{
		Chat: chat,
		Auth: config.AuthConfig{JWTSecretKey: "test-secret"},
		Services: map[string]config.ServiceConfig{
			"phoenix-user": {BaseURL: "http://phoenix-user"},
		},
		RateLimits: map[string]config.RateLimitPolicy{},
	}
	return NewHandlers(
		slog.Default(),
		nil,
		nil,
		service.NewGatewayService(slog.Default(), cfg, repository.NewStaticRouteRepository(), repository.NewMemoryRateLimitRepository()),
	)
}

func TestBuildChatEmbedURLWithResumeToken(t *testing.T) {
	cfg := config.ChatConfig{
		PublicURL:  "https://chat.hulana.com",
		IframePath: "/channel/%s?layout=embedded",
	}
	got := buildChatEmbedURL(cfg, "global", "resume-token")
	want := "https://chat.hulana.com/channel/global?layout=embedded&resumeToken=resume-token"
	if got != want {
		t.Fatalf("expected %s, got %s", want, got)
	}
}

func TestReportChatMessageRequiresEnabledChat(t *testing.T) {
	h := newChatTestHandlers(config.ChatConfig{Enabled: false})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/chat/report", nil).WithContext(context.Background())
	rec := httptest.NewRecorder()

	h.ReportChatMessage(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rec.Code)
	}
}

func TestReportChatMessageRequiresAuditDB(t *testing.T) {
	h := newChatTestHandlers(config.ChatConfig{Enabled: true})
	body := bytes.NewBufferString(`{"room_id":"global","message_id":"msg-1","reason":"spam"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/chat/report", body).WithContext(context.Background())
	req.Header.Set("Authorization", "Bearer "+newChatTestToken(t))
	rec := httptest.NewRecorder()

	middleware.JWTAuth(slog.Default(), "test-secret", "", "")(http.HandlerFunc(h.ReportChatMessage)).ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rec.Code)
	}
}

func newChatTestToken(t *testing.T) string {
	t.Helper()
	claims := &middleware.Claims{
		UserID:   "00000000-0000-4000-8000-000000000001",
		Username: "chat-tester",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return signed
}

func TestIsChatUserBlocked(t *testing.T) {
	for _, status := range []string{"suspended", "deactivated", "disabled", "inactive", "banned", "closed"} {
		if !isChatUserBlocked(status) {
			t.Fatalf("expected status %q to block chat", status)
		}
	}
	for _, status := range []string{"", "active", "verified"} {
		if isChatUserBlocked(status) {
			t.Fatalf("expected status %q to allow chat", status)
		}
	}
}

func TestRocketChatRolesMapModeratorAndAdmin(t *testing.T) {
	got := rocketChatRoles([]string{"player", "moderator", "admin"})
	want := map[string]bool{"user": true, "moderator": true, "admin": true}
	for _, role := range got {
		delete(want, role)
	}
	if len(want) != 0 {
		t.Fatalf("missing mapped roles: %+v from %+v", want, got)
	}
}

func TestRandomUUIDShape(t *testing.T) {
	got, err := randomUUID()
	if err != nil {
		t.Fatalf("randomUUID() error = %v", err)
	}
	if len(got) != 36 || got[14] != '4' {
		t.Fatalf("unexpected uuid shape: %s", got)
	}
}
