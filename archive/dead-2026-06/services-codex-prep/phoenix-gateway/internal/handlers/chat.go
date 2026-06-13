package handlers

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/phoenixbot/phoenix-gateway/internal/config"
	"github.com/phoenixbot/phoenix-gateway/internal/middleware"
)

type chatRoomResponse struct {
	Enabled  bool          `json:"enabled"`
	Provider string        `json:"provider,omitempty"`
	Room     *chatRoomInfo `json:"room,omitempty"`
	EmbedURL string        `json:"embed_url,omitempty"`
	Reason   string        `json:"reason,omitempty"`
}

type chatRoomInfo struct {
	Type        string `json:"type"`
	ID          string `json:"id"`
	DisplayName string `json:"display_name"`
	ReadOnly    bool   `json:"read_only"`
}

type chatSessionResponse struct {
	Provider  string       `json:"provider"`
	Room      chatRoomInfo `json:"room"`
	EmbedURL  string       `json:"embed_url"`
	ExpiresAt time.Time    `json:"expires_at"`
	User      chatUserInfo `json:"user"`
}

type chatUserInfo struct {
	UserID   string   `json:"user_id"`
	Username string   `json:"username"`
	Roles    []string `json:"roles"`
}

type chatReportRequest struct {
	RoomID    string `json:"room_id"`
	MessageID string `json:"message_id"`
	Reason    string `json:"reason"`
}

type userDetail struct {
	UserID   string   `json:"user_id"`
	Username string   `json:"username"`
	Status   string   `json:"status"`
	Roles    []string `json:"roles"`
}

func (h *Handlers) ResolveChatRoom(w http.ResponseWriter, r *http.Request) {
	cfg := h.service.ChatConfig()
	if !cfg.Enabled {
		_ = middleware.WriteJSON(w, http.StatusOK, chatRoomResponse{Enabled: false, Reason: "chat disabled"})
		return
	}
	if err := validateChatConfig(cfg); err != nil {
		h.logger.Warn("chat room resolution unavailable", slog.Any("error", err))
		_ = middleware.WriteJSON(w, http.StatusOK, chatRoomResponse{Enabled: false, Reason: "chat provider unavailable"})
		return
	}
	room := defaultChatRoom(cfg)
	_ = middleware.WriteJSON(w, http.StatusOK, chatRoomResponse{
		Enabled:  true,
		Provider: normalizeChatProvider(cfg.Provider),
		Room:     &room,
		EmbedURL: buildChatEmbedURL(cfg, room.ID, ""),
	})
}

func (h *Handlers) CreateChatSession(w http.ResponseWriter, r *http.Request) {
	cfg := h.service.ChatConfig()
	if !cfg.Enabled {
		_ = middleware.WriteError(w, http.StatusServiceUnavailable, "CHAT_DISABLED", "chat is disabled", nil)
		return
	}
	if err := validateChatConfig(cfg); err != nil {
		_ = middleware.WriteError(w, http.StatusServiceUnavailable, "CHAT_PROVIDER_UNAVAILABLE", err.Error(), nil)
		return
	}
	if normalizeChatProvider(cfg.Provider) != "rocketchat" {
		_ = middleware.WriteError(w, http.StatusServiceUnavailable, "CHAT_PROVIDER_UNSUPPORTED", "configured chat provider is unsupported", nil)
		return
	}
	claims := middleware.GetClaims(r)
	if claims == nil || strings.TrimSpace(claims.UserID) == "" {
		_ = middleware.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required", nil)
		return
	}
	user, err := h.fetchChatUser(r.Context(), r.Header.Get("Authorization"), claims.UserID)
	if err != nil {
		h.logger.Warn("chat user validation failed", slog.Any("error", err), slog.String("user_id", claims.UserID))
		_ = middleware.WriteError(w, http.StatusForbidden, "CHAT_USER_NOT_ALLOWED", "chat access is unavailable for this account", nil)
		return
	}

	client := rocketChatClient{baseURL: cfg.InternalURL, adminUserID: cfg.RocketChatAdminUserID, adminAuthToken: cfg.RocketChatAdminAuthToken, httpClient: http.DefaultClient}
	if isChatUserBlocked(user.Status) {
		if err := client.deactivateUser(r.Context(), rocketChatUsername(user.UserID)); err != nil {
			h.logger.Warn("rocketchat user deactivation failed", slog.Any("error", err), slog.String("user_id", claims.UserID))
		}
		_ = middleware.WriteError(w, http.StatusForbidden, "CHAT_USER_NOT_ALLOWED", "chat access is unavailable for this account", nil)
		return
	}
	token, err := client.ensureSession(r.Context(), user)
	if err != nil {
		h.logger.Error("rocketchat session creation failed", slog.Any("error", err), slog.String("user_id", claims.UserID))
		_ = middleware.WriteError(w, http.StatusBadGateway, "CHAT_PROVIDER_UNAVAILABLE", "chat provider session could not be created", nil)
		return
	}

	room := defaultChatRoom(cfg)
	expiresAt := time.Now().UTC().Add(cfg.SessionTokenTTL)
	_ = middleware.WriteJSON(w, http.StatusOK, chatSessionResponse{
		Provider:  "rocketchat",
		Room:      room,
		EmbedURL:  buildChatEmbedURL(cfg, room.ID, token),
		ExpiresAt: expiresAt,
		User:      chatUserInfo{UserID: user.UserID, Username: user.Username, Roles: user.Roles},
	})
}

func (h *Handlers) ReportChatMessage(w http.ResponseWriter, r *http.Request) {
	cfg := h.service.ChatConfig()
	if !cfg.Enabled {
		_ = middleware.WriteError(w, http.StatusServiceUnavailable, "CHAT_DISABLED", "chat is disabled", nil)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	var req chatReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body", nil)
		return
	}
	if strings.TrimSpace(req.RoomID) == "" || strings.TrimSpace(req.MessageID) == "" || strings.TrimSpace(req.Reason) == "" {
		_ = middleware.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "room_id, message_id, and reason are required", nil)
		return
	}
	if len(strings.TrimSpace(req.MessageID)) > 255 || len(strings.TrimSpace(req.Reason)) > 1000 {
		_ = middleware.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "message_id must be 255 characters or fewer and reason must be 1000 characters or fewer", nil)
		return
	}
	claims := middleware.GetClaims(r)
	if claims == nil || strings.TrimSpace(claims.UserID) == "" {
		_ = middleware.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required", nil)
		return
	}
	userID := ""
	if claims != nil {
		userID = claims.UserID
	}
	reportID, err := h.writeChatReportAudit(r.Context(), userID, middleware.ClientIP(r), req)
	if err != nil {
		h.logger.Error("chat report audit write failed", slog.Any("error", err), slog.String("user_id", userID), slog.String("room_id", req.RoomID), slog.String("message_id", req.MessageID))
		_ = middleware.WriteError(w, http.StatusServiceUnavailable, "CHAT_REPORT_UNAVAILABLE", "chat report could not be recorded", nil)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, map[string]any{
		"status":    "accepted",
		"report_id": reportID,
	})
}

func (h *Handlers) DeactivateChatUser(w http.ResponseWriter, r *http.Request) {
	cfg := h.service.ChatConfig()
	if !cfg.Enabled {
		_ = middleware.WriteError(w, http.StatusServiceUnavailable, "CHAT_DISABLED", "chat is disabled", nil)
		return
	}
	if err := validateChatConfig(cfg); err != nil {
		_ = middleware.WriteError(w, http.StatusServiceUnavailable, "CHAT_PROVIDER_UNAVAILABLE", err.Error(), nil)
		return
	}
	userID := strings.TrimSpace(chi.URLParam(r, "userID"))
	if userID == "" {
		_ = middleware.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "userID is required", nil)
		return
	}
	client := rocketChatClient{baseURL: cfg.InternalURL, adminUserID: cfg.RocketChatAdminUserID, adminAuthToken: cfg.RocketChatAdminAuthToken, httpClient: http.DefaultClient}
	if err := client.deactivateUser(r.Context(), rocketChatUsername(userID)); err != nil {
		h.logger.Error("rocketchat user deactivation failed", slog.Any("error", err), slog.String("user_id", userID))
		_ = middleware.WriteError(w, http.StatusBadGateway, "CHAT_PROVIDER_UNAVAILABLE", "chat provider user could not be deactivated", nil)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]any{"status": "deactivated"})
}

func (h *Handlers) writeChatReportAudit(ctx context.Context, userID, ipAddress string, req chatReportRequest) (string, error) {
	if h.auditDB == nil {
		return "", errors.New("audit database is not configured")
	}
	reportID, err := randomUUID()
	if err != nil {
		return "", err
	}
	newValue := map[string]any{
		"room_id":    strings.TrimSpace(req.RoomID),
		"message_id": strings.TrimSpace(req.MessageID),
		"reason":     strings.TrimSpace(req.Reason),
	}
	payload, err := json.Marshal(newValue)
	if err != nil {
		return "", err
	}
	_, err = h.auditDB.Exec(ctx, `
		INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
		VALUES ($1, NULLIF($2,'')::uuid, $3, $4, NULLIF($5,''), NULL, $6, NULLIF($7,'')::inet, $8)
	`, reportID, strings.TrimSpace(userID), "prediction.chat.reported", "prediction_chat_report", strings.TrimSpace(req.MessageID), payload, strings.TrimSpace(ipAddress), time.Now().UTC())
	return reportID, err
}

func (h *Handlers) fetchChatUser(ctx context.Context, authHeader, userID string) (userDetail, error) {
	baseURL, ok := h.service.ServiceURL("phoenix-user")
	if !ok || strings.TrimSpace(baseURL) == "" {
		return userDetail{}, errors.New("phoenix-user service unavailable")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(baseURL, "/")+"/api/v1/users/"+url.PathEscape(userID), nil)
	if err != nil {
		return userDetail{}, err
	}
	if strings.TrimSpace(authHeader) != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return userDetail{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= http.StatusBadRequest {
		return userDetail{}, fmt.Errorf("user validation returned status %d", resp.StatusCode)
	}
	var user userDetail
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return userDetail{}, err
	}
	if strings.TrimSpace(user.UserID) == "" || strings.TrimSpace(user.Username) == "" {
		return userDetail{}, errors.New("user validation returned incomplete profile")
	}
	return user, nil
}

func isChatUserBlocked(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "suspended", "deactivated", "disabled", "inactive", "banned", "closed":
		return true
	default:
		return false
	}
}

func validateChatConfig(cfg config.ChatConfig) error {
	if normalizeChatProvider(cfg.Provider) != "rocketchat" {
		return errors.New("only rocketchat provider is supported")
	}
	if strings.TrimSpace(cfg.PublicURL) == "" || strings.TrimSpace(cfg.InternalURL) == "" {
		return errors.New("chat provider URL is not configured")
	}
	if strings.TrimSpace(cfg.RocketChatAdminUserID) == "" || strings.TrimSpace(cfg.RocketChatAdminAuthToken) == "" {
		return errors.New("chat provider admin credentials are not configured")
	}
	return nil
}

func defaultChatRoom(cfg config.ChatConfig) chatRoomInfo {
	roomID := strings.TrimSpace(cfg.DefaultRoom)
	if roomID == "" {
		roomID = "global"
	}
	return chatRoomInfo{Type: "global", ID: roomID, DisplayName: "Global", ReadOnly: false}
}

func buildChatEmbedURL(cfg config.ChatConfig, roomID, resumeToken string) string {
	pathTemplate := cfg.IframePath
	if strings.TrimSpace(pathTemplate) == "" {
		pathTemplate = "/channel/%s?layout=embedded"
	}
	path := fmt.Sprintf(pathTemplate, url.PathEscape(roomID))
	base := strings.TrimRight(cfg.PublicURL, "/")
	embedURL, err := url.Parse(base + path)
	if err != nil {
		return base
	}
	if strings.TrimSpace(resumeToken) != "" {
		q := embedURL.Query()
		q.Set("resumeToken", resumeToken)
		embedURL.RawQuery = q.Encode()
	}
	return embedURL.String()
}

func normalizeChatProvider(provider string) string {
	return strings.ToLower(strings.TrimSpace(provider))
}

type rocketChatClient struct {
	baseURL        string
	adminUserID    string
	adminAuthToken string
	httpClient     *http.Client
}

func (c rocketChatClient) ensureSession(ctx context.Context, user userDetail) (string, error) {
	username := rocketChatUsername(user.UserID)
	password, err := randomToken(32)
	if err != nil {
		return "", err
	}
	info, err := c.userInfo(ctx, username)
	if err == nil && strings.TrimSpace(info.ID) != "" {
		if err := c.updateUser(ctx, info.ID, user, username, password); err != nil {
			return "", err
		}
	} else {
		if err := c.createUser(ctx, user, username, password); err != nil {
			return "", err
		}
	}
	return c.login(ctx, username, password)
}

func (c rocketChatClient) deactivateUser(ctx context.Context, username string) error {
	info, err := c.userInfo(ctx, username)
	if err != nil {
		return nil
	}
	payload := map[string]any{
		"userId": info.ID,
		"data": map[string]any{
			"active": false,
		},
	}
	return c.do(ctx, http.MethodPost, "/api/v1/users.update", payload, nil, true)
}

type rocketChatUserInfo struct {
	ID string
}

func (c rocketChatClient) userInfo(ctx context.Context, username string) (rocketChatUserInfo, error) {
	var response struct {
		User struct {
			ID string `json:"_id"`
		} `json:"user"`
		Success bool `json:"success"`
	}
	err := c.do(ctx, http.MethodGet, "/api/v1/users.info?username="+url.QueryEscape(username), nil, &response, true)
	if err != nil {
		return rocketChatUserInfo{}, err
	}
	if !response.Success || response.User.ID == "" {
		return rocketChatUserInfo{}, errors.New("rocketchat user not found")
	}
	return rocketChatUserInfo{ID: response.User.ID}, nil
}

func (c rocketChatClient) createUser(ctx context.Context, user userDetail, username, password string) error {
	payload := map[string]any{
		"username":            username,
		"name":                chatDisplayName(user),
		"email":               username + "@chat.local",
		"password":            password,
		"roles":               rocketChatRoles(user.Roles),
		"active":              true,
		"verified":            true,
		"joinDefaultChannels": true,
	}
	return c.do(ctx, http.MethodPost, "/api/v1/users.create", payload, nil, true)
}

func (c rocketChatClient) updateUser(ctx context.Context, rcUserID string, user userDetail, username, password string) error {
	payload := map[string]any{
		"userId": rcUserID,
		"data": map[string]any{
			"name":     chatDisplayName(user),
			"username": username,
			"password": password,
			"roles":    rocketChatRoles(user.Roles),
			"active":   true,
		},
	}
	return c.do(ctx, http.MethodPost, "/api/v1/users.update", payload, nil, true)
}

func (c rocketChatClient) login(ctx context.Context, username, password string) (string, error) {
	payload := map[string]string{"user": username, "password": password}
	var response struct {
		Status string `json:"status"`
		Data   struct {
			AuthToken string `json:"authToken"`
		} `json:"data"`
	}
	if err := c.do(ctx, http.MethodPost, "/api/v1/login", payload, &response, false); err != nil {
		return "", err
	}
	if response.Status != "success" || strings.TrimSpace(response.Data.AuthToken) == "" {
		return "", errors.New("rocketchat login did not return an auth token")
	}
	return response.Data.AuthToken, nil
}

func (c rocketChatClient) do(ctx context.Context, method, path string, payload any, out any, admin bool) error {
	var body io.Reader
	if payload != nil {
		encoded, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		body = bytes.NewReader(encoded)
	}
	req, err := http.NewRequestWithContext(ctx, method, strings.TrimRight(c.baseURL, "/")+path, body)
	if err != nil {
		return err
	}
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if admin {
		req.Header.Set("X-User-Id", c.adminUserID)
		req.Header.Set("X-Auth-Token", c.adminAuthToken)
	}
	client := c.httpClient
	if client == nil {
		client = http.DefaultClient
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("rocketchat %s %s returned status %d", method, path, resp.StatusCode)
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	io.Copy(io.Discard, resp.Body)
	return nil
}

func chatDisplayName(user userDetail) string {
	if strings.TrimSpace(user.Username) != "" {
		return strings.TrimSpace(user.Username)
	}
	return rocketChatUsername(user.UserID)
}

func rocketChatUsername(userID string) string {
	cleaned := strings.ToLower(strings.TrimSpace(userID))
	cleaned = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' || r == '.' {
			return r
		}
		return '-'
	}, cleaned)
	if cleaned == "" {
		cleaned = "unknown"
	}
	return "hula-" + cleaned
}

func rocketChatRoles(roles []string) []string {
	out := []string{"user"}
	for _, role := range roles {
		switch strings.ToLower(strings.TrimSpace(role)) {
		case "admin":
			out = append(out, "admin")
		case "moderator":
			out = append(out, "moderator")
		}
	}
	return out
}

func randomToken(byteCount int) (string, error) {
	buf := make([]byte, byteCount)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func randomUUID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	buf[6] = (buf[6] & 0x0f) | 0x40
	buf[8] = (buf[8] & 0x3f) | 0x80
	return fmt.Sprintf("%s-%s-%s-%s-%s",
		hex.EncodeToString(buf[0:4]),
		hex.EncodeToString(buf[4:6]),
		hex.EncodeToString(buf[6:8]),
		hex.EncodeToString(buf[8:10]),
		hex.EncodeToString(buf[10:16]),
	), nil
}
