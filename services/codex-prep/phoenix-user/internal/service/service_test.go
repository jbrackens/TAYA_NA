package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/phoenixbot/phoenix-user/internal/config"
	"github.com/phoenixbot/phoenix-user/internal/models"
	"github.com/phoenixbot/phoenix-user/internal/repository"
)

type stubUserRepo struct {
	users                map[string]*models.User
	byEmail              map[string]string
	byUsername           map[string]string
	referralCodes        map[string]string
	sessions             map[string][]*models.UserSession
	verificationSessions map[string][]*models.VerificationSession
	verificationEvents   map[string][]*models.VerificationProviderEvent
	terms                *models.TermsDocument
	acceptance           map[string]*models.UserTermsAcceptance
	preferences          map[string]*models.UserPreferences
	responsibilityChecks map[string]bool
}

func newStubUserRepo() *stubUserRepo {
	return &stubUserRepo{
		users:                map[string]*models.User{},
		byEmail:              map[string]string{},
		byUsername:           map[string]string{},
		referralCodes:        map[string]string{},
		sessions:             map[string][]*models.UserSession{},
		verificationSessions: map[string][]*models.VerificationSession{},
		verificationEvents:   map[string][]*models.VerificationProviderEvent{},
		terms: &models.TermsDocument{
			CurrentTermsVersion: "1",
			TermsContent:        "Demo terms",
			TermsDaysThreshold:  365,
			CreatedAt:           time.Now().UTC(),
		},
		acceptance:           map[string]*models.UserTermsAcceptance{},
		preferences:          map[string]*models.UserPreferences{},
		responsibilityChecks: map[string]bool{},
	}
}

func (r *stubUserRepo) CreateUser(_ context.Context, user *models.User) error {
	copied := *user
	r.users[user.ID] = &copied
	r.byEmail[user.Email] = user.ID
	r.byUsername[user.Username] = user.ID
	return nil
}
func (r *stubUserRepo) GetUserByID(_ context.Context, id string) (*models.User, error) {
	user, ok := r.users[id]
	if !ok {
		return nil, repository.ErrNotFound
	}
	copied := *user
	return &copied, nil
}
func (r *stubUserRepo) GetUserByEmail(_ context.Context, email string) (*models.User, error) {
	id, ok := r.byEmail[email]
	if !ok {
		return nil, repository.ErrNotFound
	}
	return r.GetUserByID(context.Background(), id)
}
func (r *stubUserRepo) GetUserByUsername(_ context.Context, username string) (*models.User, error) {
	id, ok := r.byUsername[username]
	if !ok {
		return nil, repository.ErrNotFound
	}
	return r.GetUserByID(context.Background(), id)
}
func (r *stubUserRepo) ListUsers(_ context.Context, filters models.UserFilters) ([]*models.User, int, error) {
	users := make([]*models.User, 0, len(r.users))
	for _, user := range r.users {
		if filters.UserID != "" && user.ID != filters.UserID {
			continue
		}
		if filters.Username != "" && !strings.Contains(strings.ToLower(user.Username), strings.ToLower(filters.Username)) {
			continue
		}
		if filters.FirstName != "" && !strings.Contains(strings.ToLower(user.FirstName), strings.ToLower(filters.FirstName)) {
			continue
		}
		if filters.LastName != "" && !strings.Contains(strings.ToLower(user.LastName), strings.ToLower(filters.LastName)) {
			continue
		}
		if filters.DateOfBirth != "" && user.DateOfBirth != nil {
			if user.DateOfBirth.Format("2006-01-02") != filters.DateOfBirth {
				continue
			}
		}
		if filters.Role != "" && user.Role != filters.Role {
			continue
		}
		switch filters.Status {
		case "verified":
			if !user.IsActive || !user.IsVerified {
				continue
			}
		case "pending_verification":
			if !user.IsActive || user.IsVerified {
				continue
			}
		case "suspended":
			if user.IsActive {
				continue
			}
		}
		if filters.Query != "" {
			query := strings.ToLower(filters.Query)
			if !strings.Contains(strings.ToLower(user.Email), query) &&
				!strings.Contains(strings.ToLower(user.Username), query) &&
				!strings.Contains(strings.ToLower(user.FirstName), query) &&
				!strings.Contains(strings.ToLower(user.LastName), query) {
				continue
			}
		}
		copied := *user
		users = append(users, &copied)
	}
	total := len(users)
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 100 {
		limit = 25
	}
	offset := (page - 1) * limit
	if offset >= len(users) {
		return []*models.User{}, total, nil
	}
	end := offset + limit
	if end > len(users) {
		end = len(users)
	}
	return users[offset:end], total, nil
}
func (r *stubUserRepo) UpdateUser(_ context.Context, user *models.User) error {
	existing, ok := r.users[user.ID]
	if !ok {
		return repository.ErrNotFound
	}
	if existing.Email != "" && r.byEmail[existing.Email] == user.ID && existing.Email != user.Email {
		delete(r.byEmail, existing.Email)
	}
	copied := *user
	r.users[user.ID] = &copied
	r.byEmail[user.Email] = user.ID
	r.byUsername[user.Username] = user.ID
	return nil
}
func (r *stubUserRepo) MarkEmailVerified(_ context.Context, userID string, verifiedAt time.Time) error {
	user, ok := r.users[userID]
	if !ok {
		return repository.ErrNotFound
	}
	user.IsVerified = true
	user.EmailVerifiedAt = &verifiedAt
	return nil
}
func (r *stubUserRepo) UpdateKYCStatus(_ context.Context, userID, status string) error {
	user, ok := r.users[userID]
	if !ok {
		return repository.ErrNotFound
	}
	user.KYCStatus = status
	return nil
}
func (r *stubUserRepo) HasReferralCode(_ context.Context, userID string) (bool, error) {
	_, ok := r.referralCodes[userID]
	return ok, nil
}
func (r *stubUserRepo) CreateReferralCode(_ context.Context, userID, code string) error {
	r.referralCodes[userID] = code
	return nil
}
func (r *stubUserRepo) CreateSession(_ context.Context, session *models.UserSession) error {
	copied := *session
	for _, existing := range r.sessions[session.UserID] {
		if existing.EndedAt == nil {
			endedAt := session.StartedAt
			existing.EndedAt = &endedAt
		}
	}
	r.sessions[session.UserID] = append([]*models.UserSession{&copied}, r.sessions[session.UserID]...)
	return nil
}
func (r *stubUserRepo) GetCurrentSession(_ context.Context, userID string) (*models.UserSession, error) {
	for _, session := range r.sessions[userID] {
		if session.EndedAt == nil {
			copied := *session
			return &copied, nil
		}
	}
	return nil, repository.ErrNotFound
}
func (r *stubUserRepo) GetLatestSession(_ context.Context, userID string) (*models.UserSession, error) {
	sessions := r.sessions[userID]
	if len(sessions) == 0 {
		return nil, repository.ErrNotFound
	}
	copied := *sessions[0]
	return &copied, nil
}
func (r *stubUserRepo) ListUserSessions(_ context.Context, userID string, page, limit int) ([]*models.UserSession, int, error) {
	sessions := r.sessions[userID]
	total := len(sessions)
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	start := (page - 1) * limit
	if start >= total {
		return []*models.UserSession{}, total, nil
	}
	end := start + limit
	if end > total {
		end = total
	}
	items := make([]*models.UserSession, 0, end-start)
	for _, session := range sessions[start:end] {
		copied := *session
		items = append(items, &copied)
	}
	return items, total, nil
}
func (r *stubUserRepo) HasAcceptedResponsibilityCheck(_ context.Context, userID string) (bool, error) {
	return r.responsibilityChecks[userID], nil
}
func (r *stubUserRepo) EndCurrentSession(_ context.Context, userID string, endedAt time.Time) error {
	for _, session := range r.sessions[userID] {
		if session.EndedAt == nil {
			session.EndedAt = &endedAt
			return nil
		}
	}
	return repository.ErrNotFound
}
func (r *stubUserRepo) GetCurrentTerms(_ context.Context) (*models.TermsDocument, error) {
	if r.terms == nil {
		return nil, repository.ErrNotFound
	}
	copied := *r.terms
	return &copied, nil
}
func (r *stubUserRepo) GetLatestTermsAcceptance(_ context.Context, userID string) (*models.UserTermsAcceptance, error) {
	acceptance, ok := r.acceptance[userID]
	if !ok {
		return nil, repository.ErrNotFound
	}
	copied := *acceptance
	return &copied, nil
}
func (r *stubUserRepo) AcceptTerms(_ context.Context, acceptance *models.UserTermsAcceptance) error {
	copied := *acceptance
	r.acceptance[acceptance.UserID] = &copied
	return nil
}
func verificationSessionKey(userID, flowType string) string {
	return userID + ":" + flowType
}
func (r *stubUserRepo) CreateVerificationSession(_ context.Context, session *models.VerificationSession) error {
	copied := *session
	key := verificationSessionKey(session.UserID, session.FlowType)
	r.verificationSessions[key] = append([]*models.VerificationSession{&copied}, r.verificationSessions[key]...)
	return nil
}
func (r *stubUserRepo) GetLatestVerificationSession(_ context.Context, userID, flowType string) (*models.VerificationSession, error) {
	key := verificationSessionKey(userID, flowType)
	sessions := r.verificationSessions[key]
	if len(sessions) == 0 {
		return nil, repository.ErrNotFound
	}
	copied := *sessions[0]
	return &copied, nil
}
func (r *stubUserRepo) GetVerificationSessionByID(_ context.Context, sessionID string) (*models.VerificationSession, error) {
	for _, sessions := range r.verificationSessions {
		for _, session := range sessions {
			if session.ID == sessionID {
				copied := *session
				return &copied, nil
			}
		}
	}
	return nil, repository.ErrNotFound
}
func (r *stubUserRepo) GetVerificationSessionByProviderReference(_ context.Context, providerReference string) (*models.VerificationSession, error) {
	for _, sessions := range r.verificationSessions {
		for _, session := range sessions {
			if session.ProviderReference == providerReference {
				copied := *session
				return &copied, nil
			}
		}
	}
	return nil, repository.ErrNotFound
}
func (r *stubUserRepo) GetVerificationSessionByProviderCaseID(_ context.Context, providerCaseID string) (*models.VerificationSession, error) {
	for _, sessions := range r.verificationSessions {
		for _, session := range sessions {
			if session.ProviderCaseID == providerCaseID {
				copied := *session
				return &copied, nil
			}
		}
	}
	return nil, repository.ErrNotFound
}
func (r *stubUserRepo) ListVerificationSessions(_ context.Context, userID string) ([]*models.VerificationSession, error) {
	var sessions []*models.VerificationSession
	for key, existing := range r.verificationSessions {
		if !strings.HasPrefix(key, userID+":") {
			continue
		}
		for _, session := range existing {
			copied := *session
			sessions = append(sessions, &copied)
		}
	}
	return sessions, nil
}

func (r *stubUserRepo) ListVerificationReviewQueue(_ context.Context, provider, assignedTo, flowType, status string) ([]*models.VerificationSession, error) {
	if strings.TrimSpace(provider) == "" {
		provider = "idcomply"
	}
	var sessions []*models.VerificationSession
	for _, existing := range r.verificationSessions {
		for _, session := range existing {
			if session.Provider != provider {
				continue
			}
			if trimmedStatus := strings.TrimSpace(status); trimmedStatus != "" {
				if session.Status != trimmedStatus {
					continue
				}
			} else {
				switch session.Status {
				case "pending_review", "provider_reviewing", "questions_presented":
				default:
					continue
				}
			}
			if trimmedFlowType := strings.TrimSpace(flowType); trimmedFlowType != "" && session.FlowType != trimmedFlowType {
				continue
			}
			if strings.EqualFold(strings.TrimSpace(assignedTo), "unassigned") {
				if strings.TrimSpace(session.AssignedTo) != "" {
					continue
				}
			} else if strings.TrimSpace(assignedTo) != "" && session.AssignedTo != strings.TrimSpace(assignedTo) {
				continue
			}
			copied := *session
			sessions = append(sessions, &copied)
		}
	}
	return sessions, nil
}
func (r *stubUserRepo) AssignVerificationSession(_ context.Context, sessionID, assignedTo, reason string) (*models.VerificationSession, error) {
	for key, sessions := range r.verificationSessions {
		for i, session := range sessions {
			if session.ID != sessionID {
				continue
			}
			updated := *session
			updated.AssignedTo = strings.TrimSpace(assignedTo)
			now := time.Now().UTC()
			updated.AssignedAt = &now
			updated.UpdatedAt = now
			r.verificationSessions[key][i] = &updated
			_ = r.CreateVerificationProviderEvent(context.Background(), &models.VerificationProviderEvent{
				ID:                    "assign-event-" + sessionID,
				VerificationSessionID: sessionID,
				Provider:              updated.Provider,
				Status:                "assigned",
				Source:                "admin_assign",
				Reason:                strings.TrimSpace(reason),
				Payload:               map[string]any{"assignedTo": updated.AssignedTo},
				CreatedAt:             now,
			})
			return &updated, nil
		}
	}
	return nil, repository.ErrNotFound
}
func (r *stubUserRepo) UpdateVerificationSession(_ context.Context, session *models.VerificationSession) error {
	key := verificationSessionKey(session.UserID, session.FlowType)
	sessions := r.verificationSessions[key]
	for i, existing := range sessions {
		if existing.ID != session.ID {
			continue
		}
		copied := *session
		sessions[i] = &copied
		r.verificationSessions[key] = sessions
		return nil
	}
	return repository.ErrNotFound
}
func (r *stubUserRepo) CreateVerificationProviderEvent(_ context.Context, event *models.VerificationProviderEvent) error {
	copied := *event
	r.verificationEvents[event.VerificationSessionID] = append([]*models.VerificationProviderEvent{&copied}, r.verificationEvents[event.VerificationSessionID]...)
	return nil
}
func (r *stubUserRepo) ListVerificationProviderEvents(_ context.Context, sessionID string) ([]*models.VerificationProviderEvent, error) {
	events := r.verificationEvents[sessionID]
	result := make([]*models.VerificationProviderEvent, 0, len(events))
	for _, event := range events {
		copied := *event
		result = append(result, &copied)
	}
	return result, nil
}
func (r *stubUserRepo) AddVerificationSessionNote(_ context.Context, sessionID, note, actorUserID string) ([]*models.VerificationProviderEvent, error) {
	session, err := r.GetVerificationSessionByID(context.Background(), sessionID)
	if err != nil {
		return nil, err
	}
	if err := r.CreateVerificationProviderEvent(context.Background(), &models.VerificationProviderEvent{
		ID:                    "note-event-" + sessionID,
		VerificationSessionID: sessionID,
		Provider:              session.Provider,
		Status:                session.Status,
		Source:                "admin_note",
		Reason:                strings.TrimSpace(note),
		Payload:               map[string]any{"actorUserID": strings.TrimSpace(actorUserID)},
		CreatedAt:             time.Now().UTC(),
	}); err != nil {
		return nil, err
	}
	return r.ListVerificationProviderEvents(context.Background(), sessionID)
}
func (r *stubUserRepo) GetUserPreferences(_ context.Context, userID string) (*models.UserPreferences, error) {
	preferences, ok := r.preferences[userID]
	if !ok {
		return nil, repository.ErrNotFound
	}
	copied := *preferences
	return &copied, nil
}
func (r *stubUserRepo) UpsertUserPreferences(_ context.Context, preferences *models.UserPreferences) error {
	copied := *preferences
	r.preferences[preferences.UserID] = &copied
	return nil
}
func (r *stubUserRepo) UpdateMFAEnabled(_ context.Context, userID string, enabled bool, updatedAt time.Time) error {
	user, ok := r.users[userID]
	if !ok {
		return repository.ErrNotFound
	}
	user.MFAEnabled = enabled
	user.UpdatedAt = updatedAt
	return nil
}
func (r *stubUserRepo) MarkPhoneVerified(_ context.Context, userID string, verifiedAt time.Time) error {
	user, ok := r.users[userID]
	if !ok {
		return repository.ErrNotFound
	}
	user.PhoneVerifiedAt = &verifiedAt
	user.UpdatedAt = verifiedAt
	return nil
}
func (r *stubUserRepo) UpdatePassword(_ context.Context, userID, passwordHash string, updatedAt time.Time) error {
	user, ok := r.users[userID]
	if !ok {
		return repository.ErrNotFound
	}
	user.PasswordHash = passwordHash
	user.UpdatedAt = updatedAt
	return nil
}
func (r *stubUserRepo) ActivateUser(_ context.Context, userID string, updatedAt time.Time) error {
	user, ok := r.users[userID]
	if !ok {
		return repository.ErrNotFound
	}
	user.IsActive = true
	user.UpdatedAt = updatedAt
	return nil
}
func (r *stubUserRepo) DeactivateUser(_ context.Context, userID string, updatedAt time.Time) error {
	user, ok := r.users[userID]
	if !ok {
		return repository.ErrNotFound
	}
	user.IsActive = false
	user.UpdatedAt = updatedAt
	return nil
}

type stubTokenStore struct {
	verifications map[string]models.VerificationRecord
	byCode        map[string]models.VerificationRecord
	challenges    map[string]models.VerificationChallengeRecord
	passwordReset map[string]models.PasswordResetTokenRecord
	refresh       map[string]string
}

func newStubTokenStore() *stubTokenStore {
	return &stubTokenStore{
		verifications: map[string]models.VerificationRecord{},
		byCode:        map[string]models.VerificationRecord{},
		challenges:    map[string]models.VerificationChallengeRecord{},
		passwordReset: map[string]models.PasswordResetTokenRecord{},
		refresh:       map[string]string{},
	}
}

func newTestConfig() *config.Config {
	return &config.Config{
		JWTSecret:             "secret",
		JWTIssuer:             "phoenix-user",
		JWTAudience:           "phoenix-platform",
		AccessTokenTTL:        time.Minute,
		RefreshTokenTTL:       time.Hour,
		VerificationCodeTTL:   time.Hour,
		PasswordResetTokenTTL: time.Hour,
		DefaultReferralPrefix: "REF",
		IDPVRedirectURL:       "/account?verification=idpv",
	}
}

func (s *stubTokenStore) StoreVerificationCode(_ context.Context, record models.VerificationRecord, _ time.Duration) error {
	s.verifications[record.Email+":"+record.Code] = record
	s.byCode[record.Code] = record
	return nil
}
func (s *stubTokenStore) ConsumeVerificationCode(_ context.Context, email, code string) (*models.VerificationRecord, error) {
	record, ok := s.verifications[email+":"+code]
	if !ok {
		return nil, repository.ErrTokenNotFound
	}
	delete(s.verifications, email+":"+code)
	delete(s.byCode, code)
	return &record, nil
}
func (s *stubTokenStore) GetVerificationCodeByCode(_ context.Context, code string) (*models.VerificationRecord, error) {
	record, ok := s.byCode[code]
	if !ok {
		return nil, repository.ErrTokenNotFound
	}
	return &record, nil
}
func (s *stubTokenStore) StoreVerificationChallenge(_ context.Context, record models.VerificationChallengeRecord, _ time.Duration) error {
	s.challenges[record.ID] = record
	return nil
}
func (s *stubTokenStore) ApproveVerificationChallenge(_ context.Context, id, code string) (*models.VerificationChallengeRecord, error) {
	record, ok := s.challenges[id]
	if !ok || record.Code != code {
		return nil, repository.ErrTokenNotFound
	}
	delete(s.challenges, id)
	return &record, nil
}
func (s *stubTokenStore) StorePasswordResetToken(_ context.Context, token string, record models.PasswordResetTokenRecord, _ time.Duration) error {
	s.passwordReset[token] = record
	return nil
}
func (s *stubTokenStore) GetPasswordResetToken(_ context.Context, token string) (*models.PasswordResetTokenRecord, error) {
	record, ok := s.passwordReset[token]
	if !ok {
		return nil, repository.ErrTokenNotFound
	}
	return &record, nil
}
func (s *stubTokenStore) ConsumePasswordResetToken(_ context.Context, token string) (*models.PasswordResetTokenRecord, error) {
	record, ok := s.passwordReset[token]
	if !ok {
		return nil, repository.ErrTokenNotFound
	}
	delete(s.passwordReset, token)
	return &record, nil
}
func (s *stubTokenStore) StoreRefreshToken(_ context.Context, token, userID string, _ time.Duration) error {
	s.refresh[token] = userID
	return nil
}
func (s *stubTokenStore) GetRefreshTokenUserID(_ context.Context, token string) (string, error) {
	userID, ok := s.refresh[token]
	if !ok {
		return "", repository.ErrTokenNotFound
	}
	return userID, nil
}
func (s *stubTokenStore) DeleteRefreshToken(_ context.Context, token string) error {
	delete(s.refresh, token)
	return nil
}

func testService() UserService {
	return NewUserService(
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		&config.Config{JWTSecret: "secret", JWTIssuer: "phoenix-user", JWTAudience: "phoenix-platform", AccessTokenTTL: 15 * time.Minute, RefreshTokenTTL: time.Hour, VerificationCodeTTL: time.Hour, PasswordResetTokenTTL: time.Hour, DefaultReferralPrefix: "REF", IDPVRedirectURL: "/account?verification=idpv"},
		newStubUserRepo(),
		newStubTokenStore(),
	)
}

func testServiceWithDeps() (*stubUserRepo, *stubTokenStore, UserService) {
	repo := newStubUserRepo()
	tokens := newStubTokenStore()
	svc := NewUserService(
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		&config.Config{JWTSecret: "secret", JWTIssuer: "phoenix-user", JWTAudience: "phoenix-platform", AccessTokenTTL: 15 * time.Minute, RefreshTokenTTL: time.Hour, VerificationCodeTTL: time.Hour, PasswordResetTokenTTL: time.Hour, DefaultReferralPrefix: "REF", IDPVRedirectURL: "/account?verification=idpv"},
		repo,
		tokens,
	)
	return repo, tokens, svc
}

func TestRegisterUser(t *testing.T) {
	svc := testService()
	response, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{Email: "user@example.com", Username: "john_doe", Password: "super-secret", FirstName: "John", LastName: "Doe", Country: "us"})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	if response.Status != "pending_verification" {
		t.Fatalf("RegisterUser() status = %s, want pending_verification", response.Status)
	}
}

func TestAuthenticateUser(t *testing.T) {
	svc := testService()
	_, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{Email: "user@example.com", Username: "john_doe", Password: "super-secret"})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	response, err := svc.AuthenticateUser(context.Background(), &models.LoginRequest{Identifier: "user@example.com", Password: "super-secret"})
	if err != nil {
		t.Fatalf("AuthenticateUser() error = %v", err)
	}
	if response.AccessToken == "" || response.RefreshToken == "" {
		t.Fatalf("AuthenticateUser() returned empty tokens")
	}
	if response.SessionID == "" {
		t.Fatalf("AuthenticateUser() session id empty")
	}
}

func TestGetPermissionsIncludesAffiliate(t *testing.T) {
	repo := newStubUserRepo()
	tokens := newStubTokenStore()
	svc := NewUserService(
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		&config.Config{JWTSecret: "secret", JWTIssuer: "phoenix-user", JWTAudience: "phoenix-platform", AccessTokenTTL: time.Minute, RefreshTokenTTL: time.Hour, VerificationCodeTTL: time.Hour, DefaultReferralPrefix: "REF", IDPVRedirectURL: "/account?verification=idpv"},
		repo,
		tokens,
	)
	_, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{Email: "user@example.com", Username: "john_doe", Password: "super-secret"})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	var userID string
	for id := range repo.users {
		userID = id
	}
	_, err = svc.AssignRole(context.Background(), models.AuthClaims{UserID: "admin-id", Role: "admin"}, userID, "affiliate")
	if err != nil {
		t.Fatalf("AssignRole() error = %v", err)
	}
	permissions, err := svc.GetPermissions(context.Background(), models.AuthClaims{UserID: userID, Role: "user"}, userID)
	if err != nil {
		t.Fatalf("GetPermissions() error = %v", err)
	}
	wanted := map[string]bool{"manage_wallet": true, "view_referrals": true, "claim_rewards": true}
	for _, permission := range permissions.Permissions {
		delete(wanted, permission)
	}
	if len(wanted) != 0 {
		t.Fatalf("GetPermissions() missing permissions: %v", wanted)
	}
}

func TestGetUserRejectsForeignNonAdmin(t *testing.T) {
	svc := testService()
	_, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{Email: "user@example.com", Username: "john_doe", Password: "super-secret"})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	var userID string
	typed := svc.(*userService)
	for id := range typed.users.(*stubUserRepo).users {
		userID = id
	}
	_, err = svc.GetUser(context.Background(), models.AuthClaims{UserID: "another-user", Role: "user"}, userID)
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("GetUser() error = %v, want %v", err, ErrForbidden)
	}
}

func TestListAdminUserSessionsAllowsOperatorAndMapsLegacyShape(t *testing.T) {
	repo := newStubUserRepo()
	now := time.Now().UTC()
	endedAt := now.Add(-30 * time.Minute)
	repo.sessions["user-1"] = []*models.UserSession{
		{
			ID:                "sess-2",
			UserID:            "user-1",
			StartedAt:         now,
			IPAddress:         "127.0.0.1",
			UserAgent:         "Mozilla/5.0",
			DeviceID:          "device-2",
			DeviceFingerprint: "fingerprint-2",
		},
		{
			ID:                "sess-1",
			UserID:            "user-1",
			StartedAt:         now.Add(-2 * time.Hour),
			EndedAt:           &endedAt,
			IPAddress:         "127.0.0.2",
			UserAgent:         "Safari",
			DeviceID:          "device-1",
			DeviceFingerprint: "fingerprint-1",
		},
	}
	svc := NewUserService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo, newStubTokenStore())

	response, err := svc.ListAdminUserSessions(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, "user-1", 1, 1)
	if err != nil {
		t.Fatalf("ListAdminUserSessions() error = %v", err)
	}
	if response.CurrentPage != 1 || response.ItemsPerPage != 1 || response.TotalCount != 2 {
		t.Fatalf("ListAdminUserSessions() pagination = %+v", response)
	}
	if len(response.Data) != 1 || response.Data[0].SessionID != "sess-2" {
		t.Fatalf("ListAdminUserSessions() data = %+v", response.Data)
	}
	if got := response.Data[0].Details["deviceId"]; got != "device-2" {
		t.Fatalf("ListAdminUserSessions() deviceId = %v", got)
	}
	if got := response.Data[0].Details["ipAddress"]; got != "127.0.0.1" {
		t.Fatalf("ListAdminUserSessions() ipAddress = %v", got)
	}
}

func TestListAdminUserSessionsRejectsUnauthorizedRole(t *testing.T) {
	svc := NewUserService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, newStubUserRepo(), newStubTokenStore())
	_, err := svc.ListAdminUserSessions(context.Background(), models.AuthClaims{UserID: "user-2", Role: "user"}, "user-1", 1, 20)
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("ListAdminUserSessions() error = %v, want %v", err, ErrForbidden)
	}
}

func TestAcceptTermsAndSessionFlow(t *testing.T) {
	svc := testService()
	_, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{Email: "user@example.com", Username: "john_doe", Password: "super-secret"})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	loginResponse, err := svc.AuthenticateUser(context.Background(), &models.LoginRequest{
		Identifier:        "john_doe",
		Password:          "super-secret",
		DeviceID:          "device-123",
		DeviceFingerprint: "fp-abc",
	})
	if err != nil {
		t.Fatalf("AuthenticateUser() error = %v", err)
	}
	claims := models.AuthClaims{UserID: loginResponse.User.UserID, Role: "user"}
	sessionResponse, err := svc.GetCurrentSession(context.Background(), claims)
	if err != nil {
		t.Fatalf("GetCurrentSession() error = %v", err)
	}
	if sessionResponse.SessionID == "" || sessionResponse.SessionStartTime.IsZero() {
		t.Fatalf("GetCurrentSession() returned empty session payload")
	}
	if sessionResponse.DeviceID != "device-123" || sessionResponse.DeviceFingerprint != "fp-abc" {
		t.Fatalf("GetCurrentSession() missing device metadata: %+v", sessionResponse)
	}
	if !sessionResponse.HasToAcceptResponsibilityCheck {
		t.Fatalf("GetCurrentSession() should require responsibility check before acceptance")
	}
	acceptResponse, err := svc.AcceptTerms(context.Background(), claims, &models.AcceptTermsRequest{Version: "1"})
	if err != nil {
		t.Fatalf("AcceptTerms() error = %v", err)
	}
	if acceptResponse.HasToAcceptTerms {
		t.Fatalf("AcceptTerms() should clear terms requirement")
	}
	userDetail, err := svc.GetUser(context.Background(), claims, claims.UserID)
	if err != nil {
		t.Fatalf("GetUser() error = %v", err)
	}
	if userDetail.Terms == nil || userDetail.Terms.Version != "1" {
		t.Fatalf("GetUser() missing accepted terms: %+v", userDetail.Terms)
	}
	if !userDetail.HasToAcceptResponsibilityCheck {
		t.Fatalf("GetUser() should require responsibility check before acceptance")
	}
}

func TestAuthenticateUserWithVerificationPersistsDeviceFingerprint(t *testing.T) {
	repo := newStubUserRepo()
	tokens := newStubTokenStore()
	svc := NewUserService(
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		&config.Config{JWTSecret: "secret", JWTIssuer: "phoenix-user", JWTAudience: "phoenix-platform", AccessTokenTTL: time.Minute, RefreshTokenTTL: time.Hour, VerificationCodeTTL: time.Hour, PasswordResetTokenTTL: time.Hour, DefaultReferralPrefix: "REF", IDPVRedirectURL: "/account?verification=idpv"},
		repo,
		tokens,
	)
	_, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{
		Email:    "verify@example.com",
		Username: "verify_user",
		Password: "super-secret",
	})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	var userID string
	for id := range repo.users {
		userID = id
	}
	tokens.challenges["challenge-1"] = models.VerificationChallengeRecord{
		ID:        "challenge-1",
		UserID:    userID,
		Code:      "654321",
		Purpose:   "mfa_login",
		CreatedAt: time.Now().UTC(),
	}
	loginResponse, err := svc.AuthenticateUserWithVerification(context.Background(), &models.LoginWithVerificationRequest{
		Username:         "verify_user",
		Password:         "super-secret",
		VerificationID:   "challenge-1",
		VerificationCode: "654321",
		DeviceID:         "device-verified",
		DeviceFingerprint: map[string]any{
			"browser": "safari",
			"hash":    "abc123",
		},
	})
	if err != nil {
		t.Fatalf("AuthenticateUserWithVerification() error = %v", err)
	}
	session, err := repo.GetCurrentSession(context.Background(), loginResponse.User.UserID)
	if err != nil {
		t.Fatalf("GetCurrentSession() error = %v", err)
	}
	if session.DeviceID != "device-verified" {
		t.Fatalf("session.DeviceID = %q, want %q", session.DeviceID, "device-verified")
	}
	if !strings.Contains(session.DeviceFingerprint, "\"browser\":\"safari\"") || !strings.Contains(session.DeviceFingerprint, "\"hash\":\"abc123\"") {
		t.Fatalf("session.DeviceFingerprint = %q, want marshaled fingerprint JSON", session.DeviceFingerprint)
	}
}

func TestUpdatePreferencesPersistsAndReturnsPreferences(t *testing.T) {
	svc := testService()
	_, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{Email: "prefs@example.com", Username: "prefs_user", Password: "super-secret"})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	var userID string
	typed := svc.(*userService)
	for id := range typed.users.(*stubUserRepo).users {
		userID = id
	}
	response, err := svc.UpdatePreferences(context.Background(), models.AuthClaims{UserID: userID, Role: "user"}, &models.UpdatePreferencesRequest{
		CommunicationPreferences: models.CommunicationPreferences{
			Announcements:       true,
			Promotions:          false,
			SubscriptionUpdates: true,
			SignInNotifications: true,
		},
		BettingPreferences: models.BettingPreferences{
			AutoAcceptBetterOdds: true,
		},
	})
	if err != nil {
		t.Fatalf("UpdatePreferences() error = %v", err)
	}
	if !response.BettingPreferences.AutoAcceptBetterOdds || response.CommunicationPreferences.Promotions {
		t.Fatalf("UpdatePreferences() returned unexpected preferences: %+v", response)
	}
	userDetail, err := svc.GetUser(context.Background(), models.AuthClaims{UserID: userID, Role: "user"}, userID)
	if err != nil {
		t.Fatalf("GetUser() error = %v", err)
	}
	if !userDetail.BettingPreferences.AutoAcceptBetterOdds || userDetail.CommunicationPreferences.Promotions {
		t.Fatalf("GetUser() missing persisted preferences: %+v", userDetail)
	}
}

func TestGetUserAndCurrentSessionClearResponsibilityCheckAfterAcceptance(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	userID := "responsibility-user"
	repo.users[userID] = &models.User{
		ID:           userID,
		Email:        "responsibility@example.com",
		Username:     "responsibility",
		PasswordHash: "hash",
		Role:         "user",
		KYCStatus:    "pending",
		IsActive:     true,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	repo.sessions[userID] = []*models.UserSession{{
		ID:        "session-1",
		UserID:    userID,
		StartedAt: time.Now().UTC(),
	}}
	repo.responsibilityChecks[userID] = true

	claims := models.AuthClaims{UserID: userID, Role: "user"}
	userDetail, err := svc.GetUser(context.Background(), claims, userID)
	if err != nil {
		t.Fatalf("GetUser() error = %v", err)
	}
	if userDetail.HasToAcceptResponsibilityCheck {
		t.Fatalf("GetUser() should clear responsibility check after acceptance")
	}
	sessionResponse, err := svc.GetCurrentSession(context.Background(), claims)
	if err != nil {
		t.Fatalf("GetCurrentSession() error = %v", err)
	}
	if sessionResponse.HasToAcceptResponsibilityCheck {
		t.Fatalf("GetCurrentSession() should clear responsibility check after acceptance")
	}
}

func TestUpdateUserAllowsDedicatedEmailChange(t *testing.T) {
	repo := newStubUserRepo()
	tokenStore := newStubTokenStore()
	cfg := newTestConfig()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewUserService(logger, cfg, repo, tokenStore)

	userID := "user-change-email"
	repo.users[userID] = &models.User{
		ID:           userID,
		Email:        "old@example.com",
		Username:     "emailchanger",
		PasswordHash: "hash",
		Role:         "user",
		KYCStatus:    "pending",
		IsActive:     true,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	repo.byEmail["old@example.com"] = userID
	repo.byUsername["emailchanger"] = userID

	response, err := svc.UpdateUser(context.Background(), models.AuthClaims{UserID: userID, Role: "user"}, userID, &models.UpdateUserRequest{
		Email: "new@example.com",
	})
	if err != nil {
		t.Fatalf("UpdateUser() error = %v", err)
	}
	if response.UserID != userID {
		t.Fatalf("UpdateUser() returned wrong user id: %+v", response)
	}
	updated, err := repo.GetUserByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetUserByID() error = %v", err)
	}
	if updated.Email != "new@example.com" {
		t.Fatalf("expected email to update, got %q", updated.Email)
	}
	if _, err := repo.GetUserByEmail(context.Background(), "old@example.com"); !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("expected old email mapping to be removed, got err=%v", err)
	}
}

func TestUpdateUserRejectsDuplicateEmail(t *testing.T) {
	repo := newStubUserRepo()
	tokenStore := newStubTokenStore()
	cfg := newTestConfig()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewUserService(logger, cfg, repo, tokenStore)

	now := time.Now().UTC()
	repo.users["user-a"] = &models.User{ID: "user-a", Email: "a@example.com", Username: "usera", Role: "user", KYCStatus: "pending", IsActive: true, CreatedAt: now, UpdatedAt: now}
	repo.users["user-b"] = &models.User{ID: "user-b", Email: "b@example.com", Username: "userb", Role: "user", KYCStatus: "pending", IsActive: true, CreatedAt: now, UpdatedAt: now}
	repo.byEmail["a@example.com"] = "user-a"
	repo.byEmail["b@example.com"] = "user-b"
	repo.byUsername["usera"] = "user-a"
	repo.byUsername["userb"] = "user-b"

	_, err := svc.UpdateUser(context.Background(), models.AuthClaims{UserID: "user-a", Role: "user"}, "user-a", &models.UpdateUserRequest{
		Email: "b@example.com",
	})
	if err == nil || !strings.Contains(err.Error(), "email already registered") {
		t.Fatalf("expected duplicate email error, got %v", err)
	}
}

func TestAnswerKBAQuestionsReturnsQuestionsWithoutAnswers(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	registerResponse, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{
		Email:    "kba@example.com",
		Username: "kba_user",
		Password: "super-secret",
	})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	response, err := svc.AnswerKBAQuestions(context.Background(), models.AuthClaims{}, &models.AnswerKBAQuestionsRequest{
		PunterID: registerResponse.UserID,
	})
	if err != nil {
		t.Fatalf("AnswerKBAQuestions() error = %v", err)
	}
	if response.Type != "KBA_QUESTIONS" || len(response.Questions) != 3 {
		t.Fatalf("AnswerKBAQuestions() returned unexpected response: %+v", response)
	}
	if repo.users[registerResponse.UserID].PublicKYCStatus() == "approved" {
		t.Fatalf("expected user kyc status to remain pending before answering questions")
	}
	session, err := repo.GetLatestVerificationSession(context.Background(), registerResponse.UserID, "kba")
	if err != nil {
		t.Fatalf("GetLatestVerificationSession() error = %v", err)
	}
	if session.Status != "questions_presented" || len(session.Questions) != 3 {
		t.Fatalf("expected persisted KBA question session, got %+v", session)
	}
	if session.ProviderDecision != "questions_presented" || session.ProviderCaseID == "" {
		t.Fatalf("expected provider decision/case to persist on KBA question session, got %+v", session)
	}
}

func TestAnswerKBAQuestionsMarksUserVerifiedAfterAnswers(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	registerResponse, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{
		Email:    "kba-answers@example.com",
		Username: "kba_answers",
		Password: "super-secret",
	})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	response, err := svc.AnswerKBAQuestions(context.Background(), models.AuthClaims{}, &models.AnswerKBAQuestionsRequest{
		PunterID: registerResponse.UserID,
		Answers: []models.KBAAnswer{
			{QuestionID: "0", Answer: "36101"},
			{QuestionID: "1", Answer: "NEWPORT NEWS CITY"},
			{QuestionID: "2", Answer: "GLADSTONE"},
		},
	})
	if err != nil {
		t.Fatalf("AnswerKBAQuestions() error = %v", err)
	}
	if response.Message != "user validated" {
		t.Fatalf("AnswerKBAQuestions() message = %q, want %q", response.Message, "user validated")
	}
	if repo.users[registerResponse.UserID].PublicKYCStatus() != "approved" {
		t.Fatalf("expected user kyc status to be approved after answering KBA questions")
	}
	session, err := repo.GetLatestVerificationSession(context.Background(), registerResponse.UserID, "kba")
	if err != nil {
		t.Fatalf("GetLatestVerificationSession() error = %v", err)
	}
	if session.Status != "approved" || len(session.Answers) != 3 || session.CompletedAt == nil {
		t.Fatalf("expected approved KBA verification session, got %+v", session)
	}
	if session.ProviderDecision != "approved" || session.ProviderCaseID == "" {
		t.Fatalf("expected provider decision/case to persist on approved KBA session, got %+v", session)
	}
}

func TestStartAndCheckIDPVStatus(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	registerResponse, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{
		Email:    "idpv@example.com",
		Username: "idpv_user",
		Password: "super-secret",
	})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	claims := models.AuthClaims{UserID: registerResponse.UserID, Role: "user"}
	startResponse, err := svc.StartIDPV(context.Background(), claims, &models.IDPVStartRequest{})
	if err != nil {
		t.Fatalf("StartIDPV() error = %v", err)
	}
	if startResponse.IDPVRedirectURL == "" {
		t.Fatalf("expected StartIDPV() to return a redirect URL")
	}
	if startResponse.SessionID == "" {
		t.Fatalf("expected StartIDPV() to return a verification session id")
	}
	session, err := repo.GetLatestVerificationSession(context.Background(), registerResponse.UserID, "idpv")
	if err != nil {
		t.Fatalf("GetLatestVerificationSession() error = %v", err)
	}
	if session.Status != "pending_review" || session.ID != startResponse.SessionID {
		t.Fatalf("expected pending IDPV session, got %+v", session)
	}
	if session.ProviderDecision != "pending_review" || session.ProviderCaseID == "" {
		t.Fatalf("expected provider decision/case to persist on pending IDPV session, got %+v", session)
	}
	if _, err := svc.CheckIDPVStatus(context.Background(), claims, &models.IDPVStatusRequest{}); !errors.Is(err, ErrPhotoVerificationNotCompleted) {
		t.Fatalf("CheckIDPVStatus() error = %v, want %v", err, ErrPhotoVerificationNotCompleted)
	}
	repo.users[registerResponse.UserID].KYCStatus = "verified"
	statusResponse, err := svc.CheckIDPVStatus(context.Background(), claims, &models.IDPVStatusRequest{})
	if err != nil {
		t.Fatalf("CheckIDPVStatus() approved error = %v", err)
	}
	if statusResponse.Message != "user validated" {
		t.Fatalf("CheckIDPVStatus() message = %q, want %q", statusResponse.Message, "user validated")
	}
	if statusResponse.Status != "approved" || statusResponse.SessionID != startResponse.SessionID {
		t.Fatalf("expected approved IDPV status response, got %+v", statusResponse)
	}
	session, err = repo.GetLatestVerificationSession(context.Background(), registerResponse.UserID, "idpv")
	if err != nil {
		t.Fatalf("GetLatestVerificationSession() approved error = %v", err)
	}
	if session.Status != "approved" || session.CompletedAt == nil {
		t.Fatalf("expected approved persisted IDPV session, got %+v", session)
	}
	if session.ProviderDecision != "approved" || session.ProviderCaseID == "" {
		t.Fatalf("expected provider decision/case to persist on approved IDPV session, got %+v", session)
	}
}

func TestVerificationAndMFAFlow(t *testing.T) {
	repo := newStubUserRepo()
	tokens := newStubTokenStore()
	svc := NewUserService(
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		&config.Config{JWTSecret: "secret", JWTIssuer: "phoenix-user", JWTAudience: "phoenix-platform", AccessTokenTTL: time.Minute, RefreshTokenTTL: time.Hour, VerificationCodeTTL: time.Hour, PasswordResetTokenTTL: time.Hour, DefaultReferralPrefix: "REF", IDPVRedirectURL: "/account?verification=idpv"},
		repo,
		tokens,
	)
	_, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{
		Email:    "user@example.com",
		Username: "john_doe",
		Password: "super-secret",
	})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	var userID string
	for id, user := range repo.users {
		userID = id
		user.Phone = "+15555550123"
	}
	loginResponse, err := svc.AuthenticateUser(context.Background(), &models.LoginRequest{Identifier: "john_doe", Password: "super-secret"})
	if err != nil {
		t.Fatalf("AuthenticateUser() error = %v", err)
	}
	claims := models.AuthClaims{UserID: userID, Role: "user"}
	challenge, err := svc.RequestVerification(context.Background(), claims, &models.VerificationRequest{})
	if err != nil {
		t.Fatalf("RequestVerification() error = %v", err)
	}
	storedChallenge := tokens.challenges[challenge.VerificationID]
	if _, err := svc.CheckVerification(context.Background(), claims, &models.VerificationCheckRequest{
		VerificationID:   challenge.VerificationID,
		VerificationCode: storedChallenge.Code,
	}); err != nil {
		t.Fatalf("CheckVerification() error = %v", err)
	}
	secondChallenge, err := svc.RequestVerification(context.Background(), claims, &models.VerificationRequest{})
	if err != nil {
		t.Fatalf("RequestVerification() second error = %v", err)
	}
	secondStored := tokens.challenges[secondChallenge.VerificationID]
	if err := svc.UpdateMFA(context.Background(), claims, &models.UpdateMFAEnabledStatusRequest{
		Enabled:          true,
		VerificationID:   secondChallenge.VerificationID,
		VerificationCode: secondStored.Code,
	}); err != nil {
		t.Fatalf("UpdateMFA() error = %v", err)
	}
	userDetail, err := svc.GetUser(context.Background(), claims, userID)
	if err != nil {
		t.Fatalf("GetUser() error = %v", err)
	}
	if !userDetail.TwoFactorAuthEnabled {
		t.Fatalf("expected MFA to be enabled in user profile")
	}
	if userDetail.VerifiedAt == nil {
		t.Fatalf("expected verifiedAt to be populated after verification check")
	}
	if loginResponse.SessionID == "" {
		t.Fatalf("expected login session id")
	}
}

func TestChangePasswordWithMFA(t *testing.T) {
	repo, tokens, svc := testServiceWithDeps()
	registerResponse, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{
		Email:    "secure@example.com",
		Username: "secure_user",
		Password: "old-secret",
	})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	repo.users[registerResponse.UserID].Phone = "+15555550123"
	repo.users[registerResponse.UserID].MFAEnabled = true
	claims := models.AuthClaims{UserID: registerResponse.UserID, Role: "user"}
	tokens.challenges["pwd-change"] = models.VerificationChallengeRecord{
		ID:        "pwd-change",
		UserID:    registerResponse.UserID,
		Code:      "123456",
		Purpose:   "mfa_login",
		CreatedAt: time.Now().UTC(),
	}
	if _, err := svc.ChangePassword(context.Background(), claims, &models.ChangePasswordRequest{
		CurrentPassword:  "old-secret",
		NewPassword:      "new-secret",
		VerificationID:   "pwd-change",
		VerificationCode: "123456",
	}); err != nil {
		t.Fatalf("ChangePassword() error = %v", err)
	}
	if _, err := svc.AuthenticateUser(context.Background(), &models.LoginRequest{
		Identifier: "secure@example.com",
		Password:   "new-secret",
	}); err != nil {
		t.Fatalf("AuthenticateUser() with new password error = %v", err)
	}
}

func TestForgotAndResetPassword(t *testing.T) {
	repo, tokens, svc := testServiceWithDeps()
	registerResponse, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{
		Email:    "reset@example.com",
		Username: "reset_user",
		Password: "old-secret",
	})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	repo.users[registerResponse.UserID].Phone = "+15555550124"
	if _, err := svc.ForgotPassword(context.Background(), &models.ForgotPasswordRequest{
		Email: "reset@example.com",
	}); err != nil {
		t.Fatalf("ForgotPassword() error = %v", err)
	}
	var resetToken string
	for token := range tokens.passwordReset {
		resetToken = token
	}
	if resetToken == "" {
		t.Fatalf("ForgotPassword() did not store a reset token")
	}
	response, err := svc.RequestVerificationByVerificationCode(context.Background(), resetToken)
	if err != nil {
		t.Fatalf("RequestVerificationByVerificationCode() error = %v", err)
	}
	challenge := tokens.challenges[response.VerificationID]
	if _, err := svc.ResetPassword(context.Background(), resetToken, &models.ResetPasswordRequest{
		Password:         "new-secret",
		VerificationID:   response.VerificationID,
		VerificationCode: challenge.Code,
	}); err != nil {
		t.Fatalf("ResetPassword() error = %v", err)
	}
	if _, err := svc.AuthenticateUser(context.Background(), &models.LoginRequest{
		Identifier: "reset@example.com",
		Password:   "new-secret",
	}); err != nil {
		t.Fatalf("AuthenticateUser() with reset password error = %v", err)
	}
}

func TestDeleteCurrentUser(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	registerResponse, err := svc.RegisterUser(context.Background(), &models.RegisterRequest{
		Email:    "delete@example.com",
		Username: "delete_user",
		Password: "delete-secret",
	})
	if err != nil {
		t.Fatalf("RegisterUser() error = %v", err)
	}
	claims := models.AuthClaims{UserID: registerResponse.UserID, Role: "user"}
	if _, err := svc.AuthenticateUser(context.Background(), &models.LoginRequest{
		Identifier: "delete@example.com",
		Password:   "delete-secret",
	}); err != nil {
		t.Fatalf("AuthenticateUser() error = %v", err)
	}
	response, err := svc.DeleteCurrentUser(context.Background(), claims)
	if err != nil {
		t.Fatalf("DeleteCurrentUser() error = %v", err)
	}
	if response.Status != "deleted" {
		t.Fatalf("DeleteCurrentUser() status = %s, want deleted", response.Status)
	}
	if repo.users[registerResponse.UserID].IsActive {
		t.Fatalf("expected user to be deactivated")
	}
}

func TestApplyAdminUserLifecycleSuspend(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{
		ID:         "user-suspend",
		Email:      "suspend@example.com",
		Username:   "suspend_user",
		Role:       "user",
		IsActive:   true,
		IsVerified: true,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}
	if err := repo.CreateUser(context.Background(), user); err != nil {
		t.Fatalf("CreateUser() error = %v", err)
	}
	if err := repo.CreateSession(context.Background(), &models.UserSession{
		ID:        "sess-suspend",
		UserID:    user.ID,
		StartedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("CreateSession() error = %v", err)
	}

	response, err := svc.ApplyAdminUserLifecycle(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, user.ID, "suspend", &models.AdminUserLifecycleRequest{
		Details: "fraud review",
	})
	if err != nil {
		t.Fatalf("ApplyAdminUserLifecycle() error = %v", err)
	}
	if response.Status != "suspended" {
		t.Fatalf("ApplyAdminUserLifecycle() status = %s, want suspended", response.Status)
	}
	if repo.users[user.ID].IsActive {
		t.Fatalf("expected user to be suspended")
	}
	session, err := repo.GetCurrentSession(context.Background(), user.ID)
	if !errors.Is(err, repository.ErrNotFound) || session != nil {
		t.Fatalf("expected active session to be ended, got session=%+v err=%v", session, err)
	}
}

func TestApplyAdminUserLifecycleUnsuspend(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{
		ID:         "user-unsuspend",
		Email:      "unsuspend@example.com",
		Username:   "unsuspend_user",
		Role:       "user",
		IsActive:   false,
		IsVerified: false,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}
	if err := repo.CreateUser(context.Background(), user); err != nil {
		t.Fatalf("CreateUser() error = %v", err)
	}

	response, err := svc.ApplyAdminUserLifecycle(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, user.ID, "unsuspend", &models.AdminUserLifecycleRequest{})
	if err != nil {
		t.Fatalf("ApplyAdminUserLifecycle() error = %v", err)
	}
	if response.Status != "pending_verification" {
		t.Fatalf("ApplyAdminUserLifecycle() status = %s, want pending_verification", response.Status)
	}
	if !repo.users[user.ID].IsActive {
		t.Fatalf("expected user to be reactivated")
	}
}

func TestApplyAdminUserLifecycleLogout(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{
		ID:         "user-logout",
		Email:      "logout@example.com",
		Username:   "logout_user",
		Role:       "user",
		IsActive:   true,
		IsVerified: true,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}
	if err := repo.CreateUser(context.Background(), user); err != nil {
		t.Fatalf("CreateUser() error = %v", err)
	}
	if err := repo.CreateSession(context.Background(), &models.UserSession{
		ID:        "sess-logout",
		UserID:    user.ID,
		StartedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("CreateSession() error = %v", err)
	}

	response, err := svc.ApplyAdminUserLifecycle(context.Background(), models.AuthClaims{UserID: "trader-1", Role: "trader"}, user.ID, "logout", &models.AdminUserLifecycleRequest{})
	if err != nil {
		t.Fatalf("ApplyAdminUserLifecycle() error = %v", err)
	}
	if response.Status != "verified" {
		t.Fatalf("ApplyAdminUserLifecycle() status = %s, want verified", response.Status)
	}
	if !repo.users[user.ID].IsActive {
		t.Fatalf("expected logout not to suspend user")
	}
	session, err := repo.GetCurrentSession(context.Background(), user.ID)
	if !errors.Is(err, repository.ErrNotFound) || session != nil {
		t.Fatalf("expected active session to be ended, got session=%+v err=%v", session, err)
	}
}

func TestApplyAdminUserLifecycleRequiresAdminReviewRole(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{
		ID:        "user-forbidden",
		Email:     "forbidden@example.com",
		Username:  "forbidden_user",
		Role:      "user",
		IsActive:  true,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
	if err := repo.CreateUser(context.Background(), user); err != nil {
		t.Fatalf("CreateUser() error = %v", err)
	}

	if _, err := svc.ApplyAdminUserLifecycle(context.Background(), models.AuthClaims{UserID: "user-2", Role: "user"}, user.ID, "suspend", &models.AdminUserLifecycleRequest{
		Details: "fraud review",
	}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("ApplyAdminUserLifecycle() error = %v, want %v", err, ErrForbidden)
	}
}

func TestListVerificationSessionsAdminOnly(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{ID: "user-1", Email: "verify@example.com", Username: "verify", Role: "user", IsActive: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}
	_ = repo.CreateUser(context.Background(), user)
	session := &models.VerificationSession{
		ID:                "session-1",
		UserID:            user.ID,
		FlowType:          "idpv",
		Provider:          "idcomply",
		Status:            "pending_review",
		ProviderReference: "idcomply:idpv:session-1",
		ProviderDecision:  "pending_review",
		ProviderCaseID:    "idcomply:idpv:session-1",
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}
	if _, err := svc.ListVerificationSessions(context.Background(), models.AuthClaims{UserID: user.ID, Role: "user"}, user.ID); !errors.Is(err, ErrForbidden) {
		t.Fatalf("ListVerificationSessions() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.ListVerificationSessions(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, user.ID)
	if err != nil {
		t.Fatalf("ListVerificationSessions() admin error = %v", err)
	}
	if len(response.Data) != 1 || response.Data[0].ID != session.ID {
		t.Fatalf("ListVerificationSessions() unexpected response = %+v", response)
	}
	if response.Data[0].ProviderCaseID != session.ProviderReference || response.Data[0].ProviderDecision != session.Status {
		t.Fatalf("expected provider detail in verification session response, got %+v", response.Data[0])
	}
}

func TestGetVerificationSessionAdminOnly(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	now := time.Now().UTC()
	user := &models.User{ID: "user-session", Email: "session@example.com", Username: "session", Role: "user", IsActive: true, CreatedAt: now, UpdatedAt: now}
	_ = repo.CreateUser(context.Background(), user)
	session := &models.VerificationSession{
		ID:                "session-detail-1",
		UserID:            user.ID,
		FlowType:          "idpv",
		Provider:          "idcomply",
		Status:            "pending_review",
		ProviderReference: "idcomply:idpv:session-detail-1",
		ProviderDecision:  "pending_review",
		ProviderCaseID:    "case-123",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}
	if _, err := svc.GetVerificationSession(context.Background(), models.AuthClaims{UserID: user.ID, Role: "user"}, session.ID); !errors.Is(err, ErrForbidden) {
		t.Fatalf("GetVerificationSession() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.GetVerificationSession(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, session.ID)
	if err != nil {
		t.Fatalf("GetVerificationSession() operator error = %v", err)
	}
	if response == nil || response.ProviderCaseID != "case-123" || response.ID != session.ID {
		t.Fatalf("GetVerificationSession() unexpected response = %+v", response)
	}
}

func TestGetVerificationSessionByProviderReferenceAdminOnly(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	now := time.Now().UTC()
	user := &models.User{ID: "user-provider-ref", Email: "provider-ref@example.com", Username: "provider_ref", Role: "user", IsActive: true, CreatedAt: now, UpdatedAt: now}
	_ = repo.CreateUser(context.Background(), user)
	session := &models.VerificationSession{
		ID:                "session-provider-ref-1",
		UserID:            user.ID,
		FlowType:          "kba",
		Provider:          "idcomply",
		Status:            "questions_presented",
		ProviderReference: "idcomply:kba:session-provider-ref-1",
		ProviderDecision:  "questions_presented",
		ProviderCaseID:    "case-provider-ref-1",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}
	if _, err := svc.GetVerificationSessionByProviderReference(context.Background(), models.AuthClaims{UserID: user.ID, Role: "user"}, session.ProviderReference); !errors.Is(err, ErrForbidden) {
		t.Fatalf("GetVerificationSessionByProviderReference() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.GetVerificationSessionByProviderReference(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, session.ProviderReference)
	if err != nil {
		t.Fatalf("GetVerificationSessionByProviderReference() operator error = %v", err)
	}
	if response == nil || response.ProviderReference != session.ProviderReference || response.ID != session.ID {
		t.Fatalf("GetVerificationSessionByProviderReference() unexpected response = %+v", response)
	}
}

func TestGetVerificationSessionByProviderCaseIDAdminOnly(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{
		ID: "usr-case-1", Email: "case@example.com", Username: "case-user", PasswordHash: "hash",
		Role: "user", KYCStatus: "pending", IsActive: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	if err := repo.CreateUser(context.Background(), user); err != nil {
		t.Fatalf("CreateUser() error = %v", err)
	}
	session := &models.VerificationSession{
		ID: "sess-case-1", UserID: user.ID, FlowType: "idpv", Provider: "idcomply", Status: "pending_review",
		ProviderReference: "idcomply:idpv:sess-case-1", ProviderCaseID: "case-123", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}
	if _, err := svc.GetVerificationSessionByProviderCaseID(context.Background(), models.AuthClaims{UserID: user.ID, Role: "user"}, session.ProviderCaseID); !errors.Is(err, ErrForbidden) {
		t.Fatalf("GetVerificationSessionByProviderCaseID() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.GetVerificationSessionByProviderCaseID(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, session.ProviderCaseID)
	if err != nil {
		t.Fatalf("GetVerificationSessionByProviderCaseID() operator error = %v", err)
	}
	if response.ID != session.ID || response.ProviderCaseID != session.ProviderCaseID {
		t.Fatalf("GetVerificationSessionByProviderCaseID() unexpected response = %+v", response)
	}
}

func TestListVerificationReviewQueueAdminOnly(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	now := time.Now().UTC()
	user := &models.User{ID: "user-rq", Email: "review@example.com", Username: "review", Role: "user", IsActive: true, CreatedAt: now, UpdatedAt: now}
	_ = repo.CreateUser(context.Background(), user)
	for _, session := range []*models.VerificationSession{
		{
			ID:                "session-rq-1",
			UserID:            user.ID,
			FlowType:          "idpv",
			Provider:          "idcomply",
			Status:            "pending_review",
			ProviderReference: "idcomply:idpv:session-rq-1",
			CreatedAt:         now,
			UpdatedAt:         now,
		},
		{
			ID:                "session-rq-2",
			UserID:            user.ID,
			FlowType:          "kba",
			Provider:          "idcomply",
			Status:            "questions_presented",
			ProviderReference: "idcomply:kba:session-rq-2",
			CreatedAt:         now,
			UpdatedAt:         now.Add(time.Minute),
		},
		{
			ID:                "session-rq-3",
			UserID:            user.ID,
			FlowType:          "idpv",
			Provider:          "other-provider",
			Status:            "pending_review",
			ProviderReference: "other:session-rq-3",
			CreatedAt:         now,
			UpdatedAt:         now,
		},
	} {
		if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
			t.Fatalf("CreateVerificationSession() error = %v", err)
		}
	}
	if _, err := svc.ListVerificationReviewQueue(context.Background(), models.AuthClaims{UserID: user.ID, Role: "user"}, "idcomply", "", "", ""); !errors.Is(err, ErrForbidden) {
		t.Fatalf("ListVerificationReviewQueue() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.ListVerificationReviewQueue(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, "idcomply", "", "", "")
	if err != nil {
		t.Fatalf("ListVerificationReviewQueue() operator error = %v", err)
	}
	if len(response.Data) != 2 {
		t.Fatalf("ListVerificationReviewQueue() expected 2 sessions, got %+v", response.Data)
	}
	for _, session := range response.Data {
		if session.Provider != "idcomply" {
			t.Fatalf("expected provider filter to apply, got %+v", session)
		}
	}
}

func TestListVerificationReviewQueueFiltersByAssignedOperator(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	now := time.Now().UTC()
	user := &models.User{ID: "user-rq-assigned", Email: "assigned@example.com", Username: "assigned", Role: "user", IsActive: true, CreatedAt: now, UpdatedAt: now}
	_ = repo.CreateUser(context.Background(), user)
	assignedAt := now.Add(time.Minute)
	for _, session := range []*models.VerificationSession{
		{
			ID:                "session-rq-a1",
			UserID:            user.ID,
			FlowType:          "idpv",
			Provider:          "idcomply",
			Status:            "pending_review",
			ProviderReference: "idcomply:idpv:session-rq-a1",
			AssignedTo:        "operator-1",
			AssignedAt:        &assignedAt,
			CreatedAt:         now,
			UpdatedAt:         assignedAt,
		},
		{
			ID:                "session-rq-a2",
			UserID:            user.ID,
			FlowType:          "idpv",
			Provider:          "idcomply",
			Status:            "pending_review",
			ProviderReference: "idcomply:idpv:session-rq-a2",
			CreatedAt:         now,
			UpdatedAt:         now,
		},
	} {
		if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
			t.Fatalf("CreateVerificationSession() error = %v", err)
		}
	}
	response, err := svc.ListVerificationReviewQueue(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, "idcomply", "operator-1", "", "")
	if err != nil {
		t.Fatalf("ListVerificationReviewQueue() assigned filter error = %v", err)
	}
	if len(response.Data) != 1 || response.Data[0].ID != "session-rq-a1" {
		t.Fatalf("ListVerificationReviewQueue() assigned filter unexpected response = %+v", response.Data)
	}
	response, err = svc.ListVerificationReviewQueue(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, "idcomply", "unassigned", "", "")
	if err != nil {
		t.Fatalf("ListVerificationReviewQueue() unassigned filter error = %v", err)
	}
	if len(response.Data) != 1 || response.Data[0].ID != "session-rq-a2" {
		t.Fatalf("ListVerificationReviewQueue() unassigned filter unexpected response = %+v", response.Data)
	}
}

func TestListVerificationReviewQueueFiltersByFlowTypeAndStatus(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	now := time.Now().UTC()
	user := &models.User{ID: "user-rq-flow", Email: "flow@example.com", Username: "flow", Role: "user", IsActive: true, CreatedAt: now, UpdatedAt: now}
	_ = repo.CreateUser(context.Background(), user)
	for _, session := range []*models.VerificationSession{
		{
			ID: "session-rq-flow-1", UserID: user.ID, FlowType: "idpv", Provider: "idcomply", Status: "pending_review",
			ProviderReference: "idcomply:idpv:session-rq-flow-1", CreatedAt: now, UpdatedAt: now,
		},
		{
			ID: "session-rq-flow-2", UserID: user.ID, FlowType: "kba", Provider: "idcomply", Status: "questions_presented",
			ProviderReference: "idcomply:kba:session-rq-flow-2", CreatedAt: now, UpdatedAt: now.Add(time.Minute),
		},
		{
			ID: "session-rq-flow-3", UserID: user.ID, FlowType: "idpv", Provider: "idcomply", Status: "provider_reviewing",
			ProviderReference: "idcomply:idpv:session-rq-flow-3", CreatedAt: now, UpdatedAt: now.Add(2 * time.Minute),
		},
	} {
		if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
			t.Fatalf("CreateVerificationSession() error = %v", err)
		}
	}

	response, err := svc.ListVerificationReviewQueue(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, "idcomply", "", "kba", "questions_presented")
	if err != nil {
		t.Fatalf("ListVerificationReviewQueue() filtered error = %v", err)
	}
	if len(response.Data) != 1 || response.Data[0].ID != "session-rq-flow-2" {
		t.Fatalf("ListVerificationReviewQueue() filtered unexpected response = %+v", response.Data)
	}
}

func TestExportVerificationReviewQueueCSVIncludesHeaderAndRows(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	now := time.Now().UTC()
	user := &models.User{ID: "user-rq-export", Email: "rqexport@example.com", Username: "rq_export", Role: "user", IsActive: true, CreatedAt: now, UpdatedAt: now}
	_ = repo.CreateUser(context.Background(), user)
	assignedAt := now.Add(time.Minute)
	session := &models.VerificationSession{
		ID: "session-rq-export-1", UserID: user.ID, FlowType: "idpv", Provider: "idcomply", Status: "pending_review",
		ProviderReference: "idcomply:idpv:session-rq-export-1", ProviderCaseID: "case-rq-export-1", AssignedTo: "operator-7", AssignedAt: &assignedAt,
		CreatedAt: now, UpdatedAt: assignedAt,
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}

	data, err := svc.ExportVerificationReviewQueueCSV(context.Background(), models.AuthClaims{UserID: "operator-7", Role: "operator"}, "idcomply", "operator-7", "idpv", "pending_review")
	if err != nil {
		t.Fatalf("ExportVerificationReviewQueueCSV() error = %v", err)
	}
	rows, err := csv.NewReader(bytes.NewReader(data)).ReadAll()
	if err != nil {
		t.Fatalf("csv read error = %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("expected header + 1 row, got %d rows", len(rows))
	}
	if rows[0][0] != "session_id" || rows[1][0] != session.ID || rows[1][3] != "idcomply" || rows[1][9] != "operator-7" {
		t.Fatalf("unexpected CSV content: %+v", rows)
	}
}

func TestExportVerificationReviewQueueCSVAdminOnly(t *testing.T) {
	_, _, svc := testServiceWithDeps()
	_, err := svc.ExportVerificationReviewQueueCSV(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "idcomply", "", "", "")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("ExportVerificationReviewQueueCSV() error = %v, want %v", err, ErrForbidden)
	}
}

func TestAssignVerificationSessionAdminOnly(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	now := time.Now().UTC()
	user := &models.User{ID: "user-assign", Email: "assign@example.com", Username: "assign", Role: "user", IsActive: true, CreatedAt: now, UpdatedAt: now}
	_ = repo.CreateUser(context.Background(), user)
	session := &models.VerificationSession{
		ID:                "session-assign-1",
		UserID:            user.ID,
		FlowType:          "idpv",
		Provider:          "idcomply",
		Status:            "pending_review",
		ProviderReference: "idcomply:idpv:session-assign-1",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}
	if _, err := svc.AssignVerificationSession(context.Background(), models.AuthClaims{UserID: user.ID, Role: "user"}, session.ID, &models.VerificationAssignmentRequest{AssignedTo: "operator-1"}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("AssignVerificationSession() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.AssignVerificationSession(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, session.ID, &models.VerificationAssignmentRequest{AssignedTo: "operator-1", Reason: "manual review"})
	if err != nil {
		t.Fatalf("AssignVerificationSession() admin error = %v", err)
	}
	if response.AssignedTo != "operator-1" || response.AssignedAt == nil {
		t.Fatalf("AssignVerificationSession() unexpected response = %+v", response)
	}
	events, err := svc.ListVerificationProviderEvents(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, session.ID)
	if err != nil {
		t.Fatalf("ListVerificationProviderEvents() error = %v", err)
	}
	if len(events.Data) == 0 || events.Data[0].Source != "admin_assign" {
		t.Fatalf("expected assignment event, got %+v", events.Data)
	}
}

func TestAddVerificationSessionNoteRequiresNote(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	now := time.Now().UTC()
	user := &models.User{ID: "user-note", Email: "note@example.com", Username: "note", Role: "user", IsActive: true, CreatedAt: now, UpdatedAt: now}
	_ = repo.CreateUser(context.Background(), user)
	session := &models.VerificationSession{
		ID:                "session-note-1",
		UserID:            user.ID,
		FlowType:          "idpv",
		Provider:          "idcomply",
		Status:            "pending_review",
		ProviderReference: "idcomply:idpv:session-note-1",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}
	if _, err := svc.AddVerificationSessionNote(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, session.ID, &models.VerificationNoteRequest{}); err == nil {
		t.Fatalf("AddVerificationSessionNote() expected validation error")
	}
	response, err := svc.AddVerificationSessionNote(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, session.ID, &models.VerificationNoteRequest{Note: "needs follow-up"})
	if err != nil {
		t.Fatalf("AddVerificationSessionNote() error = %v", err)
	}
	if len(response.Data) == 0 || response.Data[0].Source != "admin_note" || response.Data[0].Reason != "needs follow-up" {
		t.Fatalf("AddVerificationSessionNote() unexpected response = %+v", response.Data)
	}
}

func TestApplyProviderVerificationUpdateRecordsEventAndUpdatesKYC(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{ID: "user-2", Email: "idpv@example.com", Username: "idpv", Role: "user", KYCStatus: "pending", IsActive: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}
	_ = repo.CreateUser(context.Background(), user)
	session := &models.VerificationSession{
		ID:                "session-2",
		UserID:            user.ID,
		FlowType:          "idpv",
		Provider:          "idcomply",
		Status:            "pending_review",
		ProviderReference: "idcomply:idpv:session-2",
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}
	updated, err := svc.ApplyProviderVerificationUpdate(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, session.ID, &models.ProviderVerificationStatusUpdateRequest{
		Status: "approved",
		Reason: "provider callback accepted",
	})
	if err != nil {
		t.Fatalf("ApplyProviderVerificationUpdate() error = %v", err)
	}
	if updated.Status != "approved" || updated.CompletedAt == nil {
		t.Fatalf("ApplyProviderVerificationUpdate() unexpected session = %+v", updated)
	}
	if updated.ProviderDecision != "approved" || updated.ProviderCaseID != session.ProviderReference {
		t.Fatalf("expected provider decision/case to persist on direct update, got %+v", updated)
	}
	if repo.users[user.ID].KYCStatus != "verified" {
		t.Fatalf("expected user KYC to be verified, got %s", repo.users[user.ID].KYCStatus)
	}
	events, err := svc.ListVerificationProviderEvents(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, session.ID)
	if err != nil {
		t.Fatalf("ListVerificationProviderEvents() error = %v", err)
	}
	if len(events.Data) != 1 || events.Data[0].Status != "approved" {
		t.Fatalf("ListVerificationProviderEvents() unexpected events = %+v", events.Data)
	}
	if events.Data[0].Payload["providerDecision"] != "approved" || events.Data[0].Payload["providerCaseId"] != session.ProviderReference {
		t.Fatalf("expected provider decision/case in direct update event payload, got %+v", events.Data[0].Payload)
	}
}

func TestApplyProviderVerificationUpdateByReferenceRecordsProviderCallback(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{ID: "user-3", Email: "provider@example.com", Username: "provider", Role: "user", KYCStatus: "pending", IsActive: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}
	_ = repo.CreateUser(context.Background(), user)
	session := &models.VerificationSession{
		ID:                "session-3",
		UserID:            user.ID,
		FlowType:          "idpv",
		Provider:          "idcomply",
		Status:            "pending_review",
		ProviderReference: "idcomply:idpv:session-3",
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}
	updated, err := svc.ApplyProviderVerificationUpdateByReference(context.Background(), models.AuthClaims{UserID: "idcomply-1", Role: "data-provider"}, &models.ProviderVerificationStatusByReferenceRequest{
		ProviderReference: session.ProviderReference,
		Status:            "questions_presented",
		Reason:            "provider callback accepted",
		RedirectURL:       "https://id.example.test/session-3",
		Questions: []models.KBAQuestion{
			{QuestionID: "kba-1", Text: "Who issued your passport?", Choices: []string{"US", "CA", "MT"}},
		},
		Payload: map[string]any{
			"providerDecision": "review",
		},
	})
	if err != nil {
		t.Fatalf("ApplyProviderVerificationUpdateByReference() error = %v", err)
	}
	if updated.Status != "questions_presented" || updated.CompletedAt != nil {
		t.Fatalf("ApplyProviderVerificationUpdateByReference() unexpected session = %+v", updated)
	}
	if updated.ProviderDecision != "review" || updated.ProviderCaseID != session.ProviderReference {
		t.Fatalf("expected provider decision/case to persist on reference update, got %+v", updated)
	}
	if updated.RedirectURL != "https://id.example.test/session-3" || len(updated.Questions) != 1 {
		t.Fatalf("expected provider payload fields to persist, got %+v", updated)
	}
	if repo.users[user.ID].KYCStatus != "pending" {
		t.Fatalf("expected user KYC to remain pending, got %s", repo.users[user.ID].KYCStatus)
	}
	events, err := svc.ListVerificationProviderEvents(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, session.ID)
	if err != nil {
		t.Fatalf("ListVerificationProviderEvents() error = %v", err)
	}
	if len(events.Data) != 1 || events.Data[0].Source != "provider_callback" {
		t.Fatalf("expected provider_callback event, got %+v", events.Data)
	}
	questionCount, ok := events.Data[0].Payload["questionCount"].(int)
	if !ok {
		if count, ok := events.Data[0].Payload["questionCount"].(float64); ok {
			questionCount = int(count)
		}
	}
	if events.Data[0].Payload["providerDecision"] != "review" || questionCount != 1 {
		t.Fatalf("expected provider callback payload to be recorded, got %+v", events.Data[0].Payload)
	}
	if events.Data[0].Payload["providerCaseId"] != session.ProviderReference {
		t.Fatalf("expected provider case id to be recorded, got %+v", events.Data[0].Payload)
	}
}

func TestApplyProviderVerificationUpdateNormalizesProviderStatusAliases(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{ID: "user-4", Email: "alias@example.com", Username: "alias", Role: "user", KYCStatus: "pending", IsActive: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}
	_ = repo.CreateUser(context.Background(), user)
	session := &models.VerificationSession{
		ID:                "session-4",
		UserID:            user.ID,
		FlowType:          "idpv",
		Provider:          "idcomply",
		Status:            "pending_review",
		ProviderReference: "idcomply:idpv:session-4",
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}

	updated, err := svc.ApplyProviderVerificationUpdate(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, session.ID, &models.ProviderVerificationStatusUpdateRequest{
		Status: "completed",
		Reason: "provider says complete",
	})
	if err != nil {
		t.Fatalf("ApplyProviderVerificationUpdate() error = %v", err)
	}
	if updated.Status != "approved" || updated.CompletedAt == nil {
		t.Fatalf("ApplyProviderVerificationUpdate() normalized status = %+v, want approved with completion", updated)
	}
	if updated.ProviderDecision != "approved" || updated.ProviderCaseID != session.ProviderReference {
		t.Fatalf("expected normalized provider decision/case to persist, got %+v", updated)
	}
	if repo.users[user.ID].KYCStatus != "verified" {
		t.Fatalf("expected user KYC to be verified, got %s", repo.users[user.ID].KYCStatus)
	}
}

func TestApplyProviderVerificationUpdateByReferenceFallsBackToProviderDecision(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{ID: "user-5", Email: "decision@example.com", Username: "decision", Role: "user", KYCStatus: "pending", IsActive: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}
	_ = repo.CreateUser(context.Background(), user)
	session := &models.VerificationSession{
		ID:                "session-5",
		UserID:            user.ID,
		FlowType:          "kba",
		Provider:          "idcomply",
		Status:            "submitted_to_provider",
		ProviderReference: "idcomply:kba:session-5",
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}

	updated, err := svc.ApplyProviderVerificationUpdateByReference(context.Background(), models.AuthClaims{UserID: "idcomply-1", Role: "data-provider"}, &models.ProviderVerificationStatusByReferenceRequest{
		ProviderReference: session.ProviderReference,
		Reason:            "provider queued manual review",
		Payload: map[string]any{
			"providerDecision": "review",
		},
	})
	if err != nil {
		t.Fatalf("ApplyProviderVerificationUpdateByReference() error = %v", err)
	}
	if updated.Status != "pending_review" || updated.CompletedAt != nil {
		t.Fatalf("expected pending_review fallback, got %+v", updated)
	}
	if updated.ProviderDecision != "review" || updated.ProviderCaseID != session.ProviderReference {
		t.Fatalf("expected provider fallback decision/case to persist, got %+v", updated)
	}
}

func TestApplyProviderVerificationDecisionRecordsAdminReview(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{ID: "user-6", Email: "reviewer@example.com", Username: "reviewer", Role: "user", KYCStatus: "pending", IsActive: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}
	_ = repo.CreateUser(context.Background(), user)
	session := &models.VerificationSession{
		ID:                "session-6",
		UserID:            user.ID,
		FlowType:          "kba",
		Provider:          "idcomply",
		Status:            "pending_review",
		ProviderReference: "idcomply:kba:session-6",
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}

	if _, err := svc.ApplyProviderVerificationDecision(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, session.ID, &models.VerificationDecisionRequest{
		Decision: "approve",
		Reason:   "looks good",
	}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("ApplyProviderVerificationDecision() error = %v, want %v", err, ErrForbidden)
	}

	updated, err := svc.ApplyProviderVerificationDecision(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, session.ID, &models.VerificationDecisionRequest{
		Decision: "questions",
		Reason:   "need more answers",
		Questions: []models.KBAQuestion{
			{QuestionID: "kba-extra-1", Text: "What city issued your ID?"},
		},
		Payload: map[string]any{
			"reviewStage": "secondary",
		},
	})
	if err != nil {
		t.Fatalf("ApplyProviderVerificationDecision() admin error = %v", err)
	}
	if updated.Status != "questions_presented" || len(updated.Questions) != 1 || updated.CompletedAt != nil {
		t.Fatalf("ApplyProviderVerificationDecision() unexpected session = %+v", updated)
	}
	events, err := svc.ListVerificationProviderEvents(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, session.ID)
	if err != nil {
		t.Fatalf("ListVerificationProviderEvents() error = %v", err)
	}
	if len(events.Data) != 1 || events.Data[0].Source != "admin_review" {
		t.Fatalf("expected admin_review event, got %+v", events.Data)
	}
	if events.Data[0].Payload["decision"] != "questions" || events.Data[0].Payload["reviewedByRole"] != "admin" {
		t.Fatalf("expected decision payload to be recorded, got %+v", events.Data[0].Payload)
	}
}

func TestApplyAdminVerificationDecisionAllowsOperatorReview(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	now := time.Now().UTC()
	user := &models.User{ID: "user-admin-review", Email: "operatorreview@example.com", Username: "operator_review", Role: "user", KYCStatus: "pending", IsActive: true, CreatedAt: now, UpdatedAt: now}
	_ = repo.CreateUser(context.Background(), user)
	session := &models.VerificationSession{
		ID:                "session-admin-review-1",
		UserID:            user.ID,
		FlowType:          "idpv",
		Provider:          "idcomply",
		Status:            "pending_review",
		ProviderReference: "idcomply:idpv:session-admin-review-1",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}

	if _, err := svc.ApplyAdminVerificationDecision(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, session.ID, &models.VerificationDecisionRequest{
		Decision: "approved",
	}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("ApplyAdminVerificationDecision() error = %v, want %v", err, ErrForbidden)
	}

	updated, err := svc.ApplyAdminVerificationDecision(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, session.ID, &models.VerificationDecisionRequest{
		Decision: "approved",
		Reason:   "manual operator approval",
	})
	if err != nil {
		t.Fatalf("ApplyAdminVerificationDecision() operator error = %v", err)
	}
	if updated.Status != "approved" || updated.ProviderDecision != "approved" {
		t.Fatalf("ApplyAdminVerificationDecision() unexpected session = %+v", updated)
	}
	events, err := svc.ListVerificationProviderEvents(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, session.ID)
	if err != nil {
		t.Fatalf("ListVerificationProviderEvents() error = %v", err)
	}
	if len(events.Data) == 0 || events.Data[0].Source != "admin_review" {
		t.Fatalf("expected admin_review event, got %+v", events.Data)
	}
	if events.Data[0].Payload["decision"] != "approved" || events.Data[0].Payload["reviewedByRole"] != "operator" {
		t.Fatalf("expected operator decision payload to be recorded, got %+v", events.Data[0].Payload)
	}
}

func TestApplyProviderVerificationDecisionByReferenceRecordsAdminReview(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	now := time.Now().UTC()
	user := &models.User{ID: "user-review-by-ref", Email: "reviewbyref@example.com", Username: "review_by_ref", Role: "user", KYCStatus: "pending", IsActive: true, CreatedAt: now, UpdatedAt: now}
	_ = repo.CreateUser(context.Background(), user)
	session := &models.VerificationSession{
		ID:                "session-review-by-ref-1",
		UserID:            user.ID,
		FlowType:          "kba",
		Provider:          "idcomply",
		Status:            "pending_review",
		ProviderReference: "idcomply:kba:session-review-by-ref-1",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}

	if _, err := svc.ApplyProviderVerificationDecisionByReference(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, session.ProviderReference, &models.VerificationDecisionRequest{
		Decision: "approve",
	}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("ApplyProviderVerificationDecisionByReference() error = %v, want %v", err, ErrForbidden)
	}

	updated, err := svc.ApplyProviderVerificationDecisionByReference(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, session.ProviderReference, &models.VerificationDecisionRequest{
		Decision: "approve",
		Reason:   "provider reference review",
	})
	if err != nil {
		t.Fatalf("ApplyProviderVerificationDecisionByReference() admin error = %v", err)
	}
	if updated.ID != session.ID || updated.Status != "approved" {
		t.Fatalf("ApplyProviderVerificationDecisionByReference() unexpected session = %+v", updated)
	}
}

func TestApplyProviderVerificationUpdateByCaseIDRecordsProviderCallback(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{
		ID: "usr-case-update", Email: "provider-case-update@example.com", Username: "provider_case_update", PasswordHash: "hash",
		Role: "user", KYCStatus: "pending", IsActive: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	if err := repo.CreateUser(context.Background(), user); err != nil {
		t.Fatalf("CreateUser() error = %v", err)
	}
	session := &models.VerificationSession{
		ID: "sess-case-update", UserID: user.ID, FlowType: "idpv", Provider: "idcomply", Status: "pending_review",
		ProviderReference: "idcomply:idpv:sess-case-update", ProviderCaseID: "provider-case-update", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}
	updated, err := svc.ApplyProviderVerificationUpdateByCaseID(context.Background(), models.AuthClaims{UserID: "idcomply-1", Role: "data-provider"}, session.ProviderCaseID, &models.ProviderVerificationStatusUpdateRequest{
		Status:      "verified",
		ProviderRef: "idcomply:idpv:sess-case-update",
		Payload: map[string]any{
			"providerCaseId":   session.ProviderCaseID,
			"providerDecision": "approved",
		},
	})
	if err != nil {
		t.Fatalf("ApplyProviderVerificationUpdateByCaseID() error = %v", err)
	}
	if updated.Status != "approved" || updated.ProviderDecision != "approved" {
		t.Fatalf("ApplyProviderVerificationUpdateByCaseID() unexpected session = %+v", updated)
	}
}

func TestApplyProviderVerificationDecisionByCaseIDRecordsAdminReview(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	user := &models.User{
		ID: "usr-case-decision", Email: "provider-case-decision@example.com", Username: "provider_case_decision", PasswordHash: "hash",
		Role: "user", KYCStatus: "pending", IsActive: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	if err := repo.CreateUser(context.Background(), user); err != nil {
		t.Fatalf("CreateUser() error = %v", err)
	}
	session := &models.VerificationSession{
		ID: "sess-case-decision", UserID: user.ID, FlowType: "kba", Provider: "idcomply", Status: "questions_presented",
		ProviderReference: "idcomply:kba:sess-case-decision", ProviderCaseID: "provider-case-decision", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	if err := repo.CreateVerificationSession(context.Background(), session); err != nil {
		t.Fatalf("CreateVerificationSession() error = %v", err)
	}
	if _, err := svc.ApplyProviderVerificationDecisionByCaseID(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, session.ProviderCaseID, &models.VerificationDecisionRequest{
		Decision: "approved",
	}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("ApplyProviderVerificationDecisionByCaseID() error = %v, want %v", err, ErrForbidden)
	}
	updated, err := svc.ApplyProviderVerificationDecisionByCaseID(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, session.ProviderCaseID, &models.VerificationDecisionRequest{
		Decision: "approved",
		Reason:   "manual review complete",
	})
	if err != nil {
		t.Fatalf("ApplyProviderVerificationDecisionByCaseID() admin error = %v", err)
	}
	if updated.Status != "approved" || updated.ProviderDecision != "approved" || updated.ProviderCaseID != session.ProviderCaseID {
		t.Fatalf("ApplyProviderVerificationDecisionByCaseID() unexpected session = %+v", updated)
	}
}

func TestListAdminUsersReturnsEnrichedFields(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	dob := time.Date(1990, 3, 15, 0, 0, 0, 0, time.UTC)
	user := &models.User{
		ID:          "user-enriched",
		Email:       "enriched@example.com",
		Username:    "enriched_user",
		FirstName:   "John",
		LastName:    "Doe",
		DateOfBirth: &dob,
		Role:        "user",
		IsActive:    true,
		IsVerified:  true,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
	if err := repo.CreateUser(context.Background(), user); err != nil {
		t.Fatalf("CreateUser() error = %v", err)
	}
	response, err := svc.ListAdminUsers(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, models.UserFilters{})
	if err != nil {
		t.Fatalf("ListAdminUsers() error = %v", err)
	}
	if len(response.Data) != 1 {
		t.Fatalf("ListAdminUsers() expected 1 user, got %d", len(response.Data))
	}
	item := response.Data[0]
	if item.FirstName != "John" {
		t.Fatalf("ListAdminUsers() FirstName = %q, want %q", item.FirstName, "John")
	}
	if item.LastName != "Doe" {
		t.Fatalf("ListAdminUsers() LastName = %q, want %q", item.LastName, "Doe")
	}
	if item.DateOfBirth == nil || item.DateOfBirth.Format("2006-01-02") != "1990-03-15" {
		t.Fatalf("ListAdminUsers() DateOfBirth = %v, want 1990-03-15", item.DateOfBirth)
	}
}

func TestListAdminUsersRejectsUnauthorizedRole(t *testing.T) {
	svc := testService()
	_, err := svc.ListAdminUsers(context.Background(), models.AuthClaims{UserID: "player-1", Role: "user"}, models.UserFilters{})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("ListAdminUsers() error = %v, want %v", err, ErrForbidden)
	}
}

func TestListAdminUsersFiltersByUsername(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	for _, u := range []*models.User{
		{ID: "u1", Email: "a@x.com", Username: "alice", FirstName: "Alice", LastName: "A", Role: "user", IsActive: true, IsVerified: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()},
		{ID: "u2", Email: "b@x.com", Username: "bob", FirstName: "Bob", LastName: "B", Role: "user", IsActive: true, IsVerified: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()},
	} {
		_ = repo.CreateUser(context.Background(), u)
	}
	response, err := svc.ListAdminUsers(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, models.UserFilters{Username: "alice"})
	if err != nil {
		t.Fatalf("ListAdminUsers() error = %v", err)
	}
	if len(response.Data) != 1 || response.Data[0].Username != "alice" {
		t.Fatalf("ListAdminUsers(username=alice) got %d results", len(response.Data))
	}
}

func TestListAdminUsersFiltersByFirstName(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	for _, u := range []*models.User{
		{ID: "u1", Email: "a@x.com", Username: "alice", FirstName: "Alice", LastName: "A", Role: "user", IsActive: true, IsVerified: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()},
		{ID: "u2", Email: "b@x.com", Username: "bob", FirstName: "Bob", LastName: "B", Role: "user", IsActive: true, IsVerified: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()},
	} {
		_ = repo.CreateUser(context.Background(), u)
	}
	response, err := svc.ListAdminUsers(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, models.UserFilters{FirstName: "Bob"})
	if err != nil {
		t.Fatalf("ListAdminUsers() error = %v", err)
	}
	if len(response.Data) != 1 || response.Data[0].FirstName != "Bob" {
		t.Fatalf("ListAdminUsers(firstName=Bob) got %d results", len(response.Data))
	}
}

func TestListAdminUsersFiltersByLastName(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	for _, u := range []*models.User{
		{ID: "u1", Email: "a@x.com", Username: "alice", FirstName: "Alice", LastName: "Anderson", Role: "user", IsActive: true, IsVerified: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()},
		{ID: "u2", Email: "b@x.com", Username: "bob", FirstName: "Bob", LastName: "Brown", Role: "user", IsActive: true, IsVerified: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()},
	} {
		_ = repo.CreateUser(context.Background(), u)
	}
	response, err := svc.ListAdminUsers(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "operator"}, models.UserFilters{LastName: "Brown"})
	if err != nil {
		t.Fatalf("ListAdminUsers() error = %v", err)
	}
	if len(response.Data) != 1 || response.Data[0].LastName != "Brown" {
		t.Fatalf("ListAdminUsers(lastName=Brown) got %d results", len(response.Data))
	}
}

func TestListAdminUsersFiltersByDateOfBirth(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	dob1 := time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC)
	dob2 := time.Date(1985, 6, 15, 0, 0, 0, 0, time.UTC)
	for _, u := range []*models.User{
		{ID: "u1", Email: "a@x.com", Username: "alice", FirstName: "Alice", DateOfBirth: &dob1, Role: "user", IsActive: true, IsVerified: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()},
		{ID: "u2", Email: "b@x.com", Username: "bob", FirstName: "Bob", DateOfBirth: &dob2, Role: "user", IsActive: true, IsVerified: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()},
	} {
		_ = repo.CreateUser(context.Background(), u)
	}
	response, err := svc.ListAdminUsers(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, models.UserFilters{DateOfBirth: "1985-06-15"})
	if err != nil {
		t.Fatalf("ListAdminUsers() error = %v", err)
	}
	if len(response.Data) != 1 || response.Data[0].Username != "bob" {
		t.Fatalf("ListAdminUsers(dob=1985-06-15) got %d results", len(response.Data))
	}
}

func TestListAdminUsersFiltersByUserID(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	for _, u := range []*models.User{
		{ID: "target-id", Email: "a@x.com", Username: "alice", Role: "user", IsActive: true, IsVerified: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()},
		{ID: "other-id", Email: "b@x.com", Username: "bob", Role: "user", IsActive: true, IsVerified: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()},
	} {
		_ = repo.CreateUser(context.Background(), u)
	}
	response, err := svc.ListAdminUsers(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "trader"}, models.UserFilters{UserID: "target-id"})
	if err != nil {
		t.Fatalf("ListAdminUsers() error = %v", err)
	}
	if len(response.Data) != 1 || response.Data[0].UserID != "target-id" {
		t.Fatalf("ListAdminUsers(userID=target-id) got %d results", len(response.Data))
	}
}

func TestListAdminUsersPaginationFromLegacyParams(t *testing.T) {
	repo, _, svc := testServiceWithDeps()
	for i := 0; i < 5; i++ {
		_ = repo.CreateUser(context.Background(), &models.User{
			ID: fmt.Sprintf("user-%d", i), Email: fmt.Sprintf("u%d@x.com", i), Username: fmt.Sprintf("user%d", i),
			Role: "user", IsActive: true, IsVerified: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
		})
	}
	response, err := svc.ListAdminUsers(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, models.UserFilters{Page: 1, Limit: 2})
	if err != nil {
		t.Fatalf("ListAdminUsers() error = %v", err)
	}
	if len(response.Data) != 2 {
		t.Fatalf("ListAdminUsers(limit=2) got %d results, want 2", len(response.Data))
	}
	if response.Pagination.Total != 5 {
		t.Fatalf("ListAdminUsers() total = %d, want 5", response.Pagination.Total)
	}
}

var _ repository.TokenStore = (*stubTokenStore)(nil)
var _ repository.UserRepository = (*stubUserRepo)(nil)
var _ = redis.Nil
