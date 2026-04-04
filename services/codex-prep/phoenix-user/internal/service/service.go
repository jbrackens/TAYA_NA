package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"sort"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/phoenixbot/phoenix-user/internal/config"
	"github.com/phoenixbot/phoenix-user/internal/models"
	"github.com/phoenixbot/phoenix-user/internal/providers/idcomply"
	"github.com/phoenixbot/phoenix-user/internal/repository"
)

var (
	ErrInvalidCredentials            = errors.New("invalid credentials")
	ErrForbidden                     = errors.New("forbidden")
	ErrPhotoVerificationNotCompleted = errors.New("photo verification not completed")
)

type UserService interface {
	RegisterUser(ctx context.Context, req *models.RegisterRequest) (*models.RegisterResponse, error)
	AuthenticateUser(ctx context.Context, req *models.LoginRequest) (*models.LoginResponse, error)
	AuthenticateUserWithVerification(ctx context.Context, req *models.LoginWithVerificationRequest) (*models.LoginResponse, error)
	RefreshToken(ctx context.Context, refreshToken string) (*models.RefreshResponse, error)
	Logout(ctx context.Context, actor models.AuthClaims, req *models.LogoutRequest) error
	VerifyEmail(ctx context.Context, req *models.VerifyEmailRequest) (*models.VerifyEmailResponse, error)
	ActivateAccount(ctx context.Context, verificationCode string) (*models.VerifyEmailResponse, error)
	RequestVerification(ctx context.Context, actor models.AuthClaims, req *models.VerificationRequest) (*models.VerificationRequestByCodeResponse, error)
	RequestVerificationByPhone(ctx context.Context, actor models.AuthClaims, req *models.VerificationRequest) (*models.VerificationRequestByCodeResponse, error)
	RequestVerificationByVerificationCode(ctx context.Context, verificationCode string) (*models.VerificationRequestByCodeResponse, error)
	CheckVerification(ctx context.Context, actor models.AuthClaims, req *models.VerificationCheckRequest) (*models.VerificationCheckResponse, error)
	AnswerKBAQuestions(ctx context.Context, actor models.AuthClaims, req *models.AnswerKBAQuestionsRequest) (*models.AnswerKBAQuestionsResponse, error)
	CheckIDPVStatus(ctx context.Context, actor models.AuthClaims, req *models.IDPVStatusRequest) (*models.IDPVStatusResponse, error)
	StartIDPV(ctx context.Context, actor models.AuthClaims, req *models.IDPVStartRequest) (*models.IDPVStartResponse, error)
	ChangePassword(ctx context.Context, actor models.AuthClaims, req *models.ChangePasswordRequest) (*models.PasswordActionResponse, error)
	ForgotPassword(ctx context.Context, req *models.ForgotPasswordRequest) (*models.PasswordActionResponse, error)
	ResetPassword(ctx context.Context, token string, req *models.ResetPasswordRequest) (*models.PasswordActionResponse, error)
	DeleteCurrentUser(ctx context.Context, actor models.AuthClaims) (*models.DeleteCurrentUserResponse, error)
	ListAdminUsers(ctx context.Context, actor models.AuthClaims, filters models.UserFilters) (*models.ListUsersResponse, error)
	GetAdminUser(ctx context.Context, actor models.AuthClaims, userID string) (*models.UserDetailResponse, error)
	ApplyAdminUserLifecycle(ctx context.Context, actor models.AuthClaims, userID, action string, req *models.AdminUserLifecycleRequest) (*models.AdminUserLifecycleResponse, error)
	ListAdminUserSessions(ctx context.Context, actor models.AuthClaims, userID string, page, limit int) (*models.AdminUserSessionHistoryResponse, error)
	ListVerificationSessions(ctx context.Context, actor models.AuthClaims, userID string) (*models.VerificationSessionListResponse, error)
	GetVerificationSession(ctx context.Context, actor models.AuthClaims, sessionID string) (*models.VerificationSession, error)
	GetVerificationSessionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string) (*models.VerificationSession, error)
	GetVerificationSessionByProviderCaseID(ctx context.Context, actor models.AuthClaims, providerCaseID string) (*models.VerificationSession, error)
	ListVerificationReviewQueue(ctx context.Context, actor models.AuthClaims, provider, assignedTo, flowType, status string) (*models.VerificationReviewQueueResponse, error)
	ExportVerificationReviewQueueCSV(ctx context.Context, actor models.AuthClaims, provider, assignedTo, flowType, status string) ([]byte, error)
	ListVerificationProviderEvents(ctx context.Context, actor models.AuthClaims, sessionID string) (*models.VerificationProviderEventListResponse, error)
	AssignVerificationSession(ctx context.Context, actor models.AuthClaims, sessionID string, req *models.VerificationAssignmentRequest) (*models.VerificationSession, error)
	AddVerificationSessionNote(ctx context.Context, actor models.AuthClaims, sessionID string, req *models.VerificationNoteRequest) (*models.VerificationProviderEventListResponse, error)
	ApplyAdminVerificationDecision(ctx context.Context, actor models.AuthClaims, sessionID string, req *models.VerificationDecisionRequest) (*models.VerificationSession, error)
	ApplyProviderVerificationUpdate(ctx context.Context, actor models.AuthClaims, sessionID string, req *models.ProviderVerificationStatusUpdateRequest) (*models.VerificationSession, error)
	ApplyProviderVerificationUpdateByReference(ctx context.Context, actor models.AuthClaims, req *models.ProviderVerificationStatusByReferenceRequest) (*models.VerificationSession, error)
	ApplyProviderVerificationUpdateByCaseID(ctx context.Context, actor models.AuthClaims, providerCaseID string, req *models.ProviderVerificationStatusUpdateRequest) (*models.VerificationSession, error)
	ApplyProviderVerificationDecision(ctx context.Context, actor models.AuthClaims, sessionID string, req *models.VerificationDecisionRequest) (*models.VerificationSession, error)
	ApplyProviderVerificationDecisionByReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.VerificationDecisionRequest) (*models.VerificationSession, error)
	ApplyProviderVerificationDecisionByCaseID(ctx context.Context, actor models.AuthClaims, providerCaseID string, req *models.VerificationDecisionRequest) (*models.VerificationSession, error)
	GetUser(ctx context.Context, actor models.AuthClaims, userID string) (*models.UserDetailResponse, error)
	UpdateUser(ctx context.Context, actor models.AuthClaims, userID string, req *models.UpdateUserRequest) (*models.UpdateUserResponse, error)
	UpdatePreferences(ctx context.Context, actor models.AuthClaims, req *models.UpdatePreferencesRequest) (*models.UserPreferences, error)
	UpdateMFA(ctx context.Context, actor models.AuthClaims, req *models.UpdateMFAEnabledStatusRequest) error
	SubmitKYC(ctx context.Context, actor models.AuthClaims, req *models.KYCSubmitRequest) (*models.KYCSubmitResponse, error)
	GetRoles(ctx context.Context, actor models.AuthClaims, userID string) (*models.RolesResponse, error)
	AssignRole(ctx context.Context, actor models.AuthClaims, userID string, roleName string) (*models.AssignRoleResponse, error)
	GetPermissions(ctx context.Context, actor models.AuthClaims, userID string) (*models.PermissionSet, error)
	GetCurrentSession(ctx context.Context, actor models.AuthClaims) (*models.CurrentSessionResponse, error)
	AcceptTerms(ctx context.Context, actor models.AuthClaims, req *models.AcceptTermsRequest) (*models.AcceptTermsResponse, error)
}

type userService struct {
	logger     *slog.Logger
	cfg        *config.Config
	users      repository.UserRepository
	tokenStore repository.TokenStore
}

func NewUserService(logger *slog.Logger, cfg *config.Config, users repository.UserRepository, tokenStore repository.TokenStore) UserService {
	return &userService{logger: logger, cfg: cfg, users: users, tokenStore: tokenStore}
}

func (s *userService) RegisterUser(ctx context.Context, req *models.RegisterRequest) (*models.RegisterResponse, error) {
	if strings.TrimSpace(req.Email) == "" || strings.TrimSpace(req.Username) == "" || strings.TrimSpace(req.Password) == "" {
		return nil, fmt.Errorf("email, username, and password are required")
	}
	if _, err := s.users.GetUserByEmail(ctx, req.Email); err == nil {
		return nil, fmt.Errorf("email already registered")
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	if _, err := s.users.GetUserByUsername(ctx, req.Username); err == nil {
		return nil, fmt.Errorf("username already registered")
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	var dob *time.Time
	if strings.TrimSpace(req.DateOfBirth) != "" {
		parsed, err := time.Parse("2006-01-02", req.DateOfBirth)
		if err != nil {
			return nil, fmt.Errorf("date_of_birth must be YYYY-MM-DD")
		}
		dob = &parsed
	}

	now := time.Now().UTC()
	user := &models.User{
		ID:           uuid.NewString(),
		Email:        strings.ToLower(strings.TrimSpace(req.Email)),
		Username:     strings.TrimSpace(req.Username),
		PasswordHash: string(hash),
		Role:         "user",
		KYCStatus:    "pending",
		FirstName:    strings.TrimSpace(req.FirstName),
		LastName:     strings.TrimSpace(req.LastName),
		DateOfBirth:  dob,
		Country:      strings.ToUpper(strings.TrimSpace(req.Country)),
		IsActive:     true,
		IsVerified:   false,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := s.users.CreateUser(ctx, user); err != nil {
		return nil, err
	}
	code, err := generateVerificationCode()
	if err == nil {
		storeErr := s.tokenStore.StoreVerificationCode(ctx, models.VerificationRecord{UserID: user.ID, Email: user.Email, Code: code}, s.cfg.VerificationCodeTTL)
		if storeErr != nil {
			s.logger.Warn("store verification code failed", slog.Any("error", storeErr), slog.String("user_id", user.ID))
		}
	}
	return &models.RegisterResponse{UserID: user.ID, Email: user.Email, Username: user.Username, CreatedAt: user.CreatedAt, Status: user.PrimaryStatus()}, nil
}

func (s *userService) AuthenticateUser(ctx context.Context, req *models.LoginRequest) (*models.LoginResponse, error) {
	identifier := strings.TrimSpace(req.Identifier)
	if identifier == "" {
		identifier = strings.TrimSpace(req.Email)
	}
	if identifier == "" {
		identifier = strings.TrimSpace(req.Username)
	}
	if identifier == "" || req.Password == "" {
		return nil, ErrInvalidCredentials
	}

	user, err := s.lookupUser(ctx, identifier)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if !user.IsActive {
		return nil, fmt.Errorf("user is inactive")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}
	return s.finishAuthentication(
		ctx,
		user,
		strings.TrimSpace(req.IPAddress),
		strings.TrimSpace(req.UserAgent),
		strings.TrimSpace(req.DeviceID),
		strings.TrimSpace(req.DeviceFingerprint),
	)
}

func (s *userService) AuthenticateUserWithVerification(ctx context.Context, req *models.LoginWithVerificationRequest) (*models.LoginResponse, error) {
	if strings.TrimSpace(req.Username) == "" || strings.TrimSpace(req.Password) == "" {
		return nil, ErrInvalidCredentials
	}
	if strings.TrimSpace(req.VerificationID) == "" || strings.TrimSpace(req.VerificationCode) == "" {
		return nil, fmt.Errorf("verification id and code are required")
	}
	challenge, err := s.tokenStore.ApproveVerificationChallenge(ctx, strings.TrimSpace(req.VerificationID), strings.TrimSpace(req.VerificationCode))
	if err != nil {
		if errors.Is(err, repository.ErrTokenNotFound) {
			return nil, fmt.Errorf("incorrect mfa verification")
		}
		return nil, err
	}
	user, err := s.lookupUser(ctx, strings.TrimSpace(req.Username))
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if user.ID != challenge.UserID {
		return nil, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}
	if shouldMarkPhoneVerified(challenge.Purpose) {
		now := time.Now().UTC()
		if err := s.users.MarkPhoneVerified(ctx, user.ID, now); err != nil {
			return nil, err
		}
		user.PhoneVerifiedAt = &now
	}
	return s.finishAuthentication(
		ctx,
		user,
		strings.TrimSpace(req.IPAddress),
		strings.TrimSpace(req.UserAgent),
		strings.TrimSpace(req.DeviceID),
		normalizeDeviceFingerprint(req.DeviceFingerprint),
	)
}

func (s *userService) RefreshToken(ctx context.Context, refreshToken string) (*models.RefreshResponse, error) {
	userID, err := s.tokenStore.GetRefreshTokenUserID(ctx, strings.TrimSpace(refreshToken))
	if err != nil {
		return nil, err
	}
	user, err := s.users.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	_, permissions, err := s.resolveRolesAndPermissions(ctx, user)
	if err != nil {
		return nil, err
	}
	accessToken, err := s.issueAccessToken(user, permissions)
	if err != nil {
		return nil, err
	}
	newRefresh := uuid.NewString()
	if err := s.tokenStore.StoreRefreshToken(ctx, newRefresh, user.ID, s.cfg.RefreshTokenTTL); err != nil {
		return nil, err
	}
	if err := s.tokenStore.DeleteRefreshToken(ctx, refreshToken); err != nil {
		s.logger.Warn("delete refresh token failed", slog.Any("error", err), slog.String("user_id", user.ID))
	}
	hasToAcceptTerms, _, _, err := s.resolveTermsStatus(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	return &models.RefreshResponse{
		AccessToken:      accessToken,
		RefreshToken:     newRefresh,
		ExpiresIn:        int64(s.cfg.AccessTokenTTL.Seconds()),
		HasToAcceptTerms: hasToAcceptTerms,
		Token: models.TokenBundle{
			Token:            accessToken,
			RefreshToken:     newRefresh,
			ExpiresIn:        int64(s.cfg.AccessTokenTTL.Seconds()),
			RefreshExpiresIn: int64(s.cfg.RefreshTokenTTL.Seconds()),
			TokenType:        "Bearer",
			UserID:           user.ID,
		},
		HasToAcceptTermsV1: hasToAcceptTerms,
	}, nil
}

func (s *userService) Logout(ctx context.Context, actor models.AuthClaims, req *models.LogoutRequest) error {
	if actor.UserID == "" {
		return ErrForbidden
	}
	if strings.TrimSpace(req.RefreshToken) != "" {
		if err := s.tokenStore.DeleteRefreshToken(ctx, strings.TrimSpace(req.RefreshToken)); err != nil {
			s.logger.Warn("delete refresh token failed during logout", slog.Any("error", err), slog.String("user_id", actor.UserID))
		}
	}
	if err := s.users.EndCurrentSession(ctx, actor.UserID, time.Now().UTC()); err != nil && !errors.Is(err, repository.ErrNotFound) {
		return err
	}
	return nil
}

func (s *userService) VerifyEmail(ctx context.Context, req *models.VerifyEmailRequest) (*models.VerifyEmailResponse, error) {
	record, err := s.tokenStore.ConsumeVerificationCode(ctx, strings.ToLower(strings.TrimSpace(req.Email)), strings.TrimSpace(req.VerificationCode))
	if err != nil {
		return nil, err
	}
	verifiedAt := time.Now().UTC()
	if err := s.users.MarkEmailVerified(ctx, record.UserID, verifiedAt); err != nil {
		return nil, err
	}
	return &models.VerifyEmailResponse{UserID: record.UserID, Status: "verified", VerifiedAt: verifiedAt}, nil
}

func (s *userService) ActivateAccount(ctx context.Context, verificationCode string) (*models.VerifyEmailResponse, error) {
	record, err := s.tokenStore.GetVerificationCodeByCode(ctx, strings.TrimSpace(verificationCode))
	if err != nil {
		return nil, err
	}
	consumed, err := s.tokenStore.ConsumeVerificationCode(ctx, strings.ToLower(strings.TrimSpace(record.Email)), strings.TrimSpace(record.Code))
	if err != nil {
		return nil, err
	}
	verifiedAt := time.Now().UTC()
	if err := s.users.MarkEmailVerified(ctx, consumed.UserID, verifiedAt); err != nil {
		return nil, err
	}
	return &models.VerifyEmailResponse{UserID: consumed.UserID, Status: "verified", VerifiedAt: verifiedAt}, nil
}

func (s *userService) RequestVerification(ctx context.Context, actor models.AuthClaims, _ *models.VerificationRequest) (*models.VerificationRequestByCodeResponse, error) {
	if actor.UserID == "" {
		return nil, ErrForbidden
	}
	user, err := s.users.GetUserByID(ctx, actor.UserID)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(user.Phone) == "" {
		return nil, fmt.Errorf("phone number is required")
	}
	return s.createVerificationChallenge(ctx, user.ID, user.Phone, "mfa_login")
}

func (s *userService) RequestVerificationByPhone(ctx context.Context, actor models.AuthClaims, req *models.VerificationRequest) (*models.VerificationRequestByCodeResponse, error) {
	if actor.UserID == "" {
		return nil, ErrForbidden
	}
	user, err := s.users.GetUserByID(ctx, actor.UserID)
	if err != nil {
		return nil, err
	}
	phone := strings.TrimSpace(req.PhoneNumber)
	if phone == "" {
		phone = strings.TrimSpace(user.Phone)
	}
	if phone == "" {
		return nil, fmt.Errorf("phone number is required")
	}
	return s.createVerificationChallenge(ctx, user.ID, phone, "phone_verification")
}

func (s *userService) RequestVerificationByVerificationCode(ctx context.Context, verificationCode string) (*models.VerificationRequestByCodeResponse, error) {
	record, err := s.tokenStore.GetVerificationCodeByCode(ctx, strings.TrimSpace(verificationCode))
	if err != nil {
		if errors.Is(err, repository.ErrTokenNotFound) {
			resetRecord, resetErr := s.tokenStore.GetPasswordResetToken(ctx, strings.TrimSpace(verificationCode))
			if resetErr != nil {
				if errors.Is(resetErr, repository.ErrTokenNotFound) {
					return nil, fmt.Errorf("invalid verification code")
				}
				return nil, resetErr
			}
			user, userErr := s.users.GetUserByID(ctx, resetRecord.UserID)
			if userErr != nil {
				return nil, userErr
			}
			if strings.TrimSpace(user.Phone) == "" {
				return nil, fmt.Errorf("phone number is required")
			}
			return s.createVerificationChallenge(ctx, user.ID, user.Phone, "password_reset")
		}
		return nil, err
	}
	user, err := s.users.GetUserByID(ctx, record.UserID)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(user.Phone) == "" {
		return nil, fmt.Errorf("phone number is required")
	}
	return s.createVerificationChallenge(ctx, user.ID, user.Phone, "email_verified_login")
}

func (s *userService) CheckVerification(ctx context.Context, actor models.AuthClaims, req *models.VerificationCheckRequest) (*models.VerificationCheckResponse, error) {
	id := strings.TrimSpace(req.ID)
	if id == "" {
		id = strings.TrimSpace(req.VerificationID)
	}
	code := strings.TrimSpace(req.Code)
	if code == "" {
		code = strings.TrimSpace(req.VerificationCode)
	}
	if id == "" || code == "" {
		return nil, fmt.Errorf("verification id and code are required")
	}
	challenge, err := s.tokenStore.ApproveVerificationChallenge(ctx, id, code)
	if err != nil {
		if errors.Is(err, repository.ErrTokenNotFound) {
			return nil, fmt.Errorf("incorrect mfa verification")
		}
		return nil, err
	}
	if actor.UserID != "" && challenge.UserID != actor.UserID {
		return nil, ErrForbidden
	}
	if shouldMarkPhoneVerified(challenge.Purpose) {
		if err := s.users.MarkPhoneVerified(ctx, challenge.UserID, time.Now().UTC()); err != nil {
			return nil, err
		}
	}
	return &models.VerificationCheckResponse{
		VerificationID: challenge.ID,
		Approved:       true,
		Status:         "approved",
	}, nil
}

func (s *userService) AnswerKBAQuestions(ctx context.Context, actor models.AuthClaims, req *models.AnswerKBAQuestionsRequest) (*models.AnswerKBAQuestionsResponse, error) {
	userID, err := resolveVerificationTargetUserID(actor, req.PunterID)
	if err != nil {
		return nil, err
	}
	if _, err := s.users.GetUserByID(ctx, userID); err != nil {
		return nil, err
	}
	adapter := s.idComplyAdapter()
	currentSession, err := s.users.GetLatestVerificationSession(ctx, userID, "kba")
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	if len(req.Answers) == 0 {
		sessionID := firstNonEmpty(verificationSessionID(currentSession), uuid.NewString())
		questions, providerReference := adapter.BuildKBASession(sessionID)
		nextSession := &models.VerificationSession{
			ID:                sessionID,
			UserID:            userID,
			FlowType:          "kba",
			Provider:          adapter.KBAProvider(),
			Status:            "questions_presented",
			Questions:         questions,
			ProviderReference: providerReference,
			ProviderDecision:  "questions_presented",
			ProviderCaseID:    providerReference,
			UpdatedAt:         time.Now().UTC(),
		}
		if err := s.persistVerificationSession(ctx, currentSession, nextSession); err != nil {
			return nil, err
		}
		if err := s.recordVerificationProviderEvent(ctx, nextSession, "provider_bootstrap", "questions_presented", map[string]any{
			"questionCount": len(questions),
			"flowType":      "kba",
		}); err != nil {
			return nil, err
		}
		return &models.AnswerKBAQuestionsResponse{
			PunterID:  userID,
			Type:      "KBA_QUESTIONS",
			Questions: questions,
		}, nil
	}
	if len(req.Answers) < 3 {
		return nil, fmt.Errorf("at least 3 answers are required")
	}
	questions, providerReference := adapter.BuildKBASession(firstNonEmpty(verificationSessionID(currentSession), uuid.NewString()))
	approved, errorCode := adapter.EvaluateKBAAnswers(req.Answers)
	completedAt := time.Now().UTC()
	status := "approved"
	if !approved {
		status = "rejected"
	}
	nextSession := &models.VerificationSession{
		ID:                firstNonEmpty(verificationSessionID(currentSession), uuid.NewString()),
		UserID:            userID,
		FlowType:          "kba",
		Provider:          adapter.KBAProvider(),
		Status:            status,
		Questions:         questions,
		Answers:           req.Answers,
		ProviderReference: providerReference,
		ProviderDecision:  status,
		ProviderCaseID:    providerReference,
		LastErrorCode:     errorCode,
		UpdatedAt:         completedAt,
		CompletedAt:       &completedAt,
	}
	if err := s.persistVerificationSession(ctx, currentSession, nextSession); err != nil {
		return nil, err
	}
	if err := s.recordVerificationProviderEvent(ctx, nextSession, "provider_evaluation", firstNonEmpty(errorCode, status), map[string]any{
		"answerCount": len(req.Answers),
		"approved":    approved,
	}); err != nil {
		return nil, err
	}
	if !approved {
		return &models.AnswerKBAQuestionsResponse{Message: "provider review failed"}, nil
	}
	if err := s.users.UpdateKYCStatus(ctx, userID, "verified"); err != nil {
		return nil, err
	}
	return &models.AnswerKBAQuestionsResponse{
		Message: "user validated",
	}, nil
}

func (s *userService) CheckIDPVStatus(ctx context.Context, actor models.AuthClaims, req *models.IDPVStatusRequest) (*models.IDPVStatusResponse, error) {
	userID, err := resolveVerificationTargetUserID(actor, req.PunterID)
	if err != nil {
		return nil, err
	}
	user, err := s.users.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	adapter := s.idComplyAdapter()
	session, err := s.users.GetLatestVerificationSession(ctx, userID, "idpv")
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	if session != nil {
		nextStatus, lastErrorCode, completed := adapter.NextIDPVStatus(session, user)
		if nextStatus != session.Status || lastErrorCode != session.LastErrorCode || (completed && session.CompletedAt == nil) {
			session.Status = nextStatus
			session.ProviderDecision = nextStatus
			if strings.TrimSpace(session.ProviderCaseID) == "" {
				session.ProviderCaseID = firstNonEmpty(session.ProviderReference, session.ID)
			}
			session.LastErrorCode = lastErrorCode
			session.UpdatedAt = time.Now().UTC()
			if completed && session.CompletedAt == nil {
				completedAt := session.UpdatedAt
				session.CompletedAt = &completedAt
			}
			if err := s.users.UpdateVerificationSession(ctx, session); err != nil {
				return nil, err
			}
			if err := s.recordVerificationProviderEvent(ctx, session, "provider_poll", firstNonEmpty(lastErrorCode, nextStatus), map[string]any{
				"completed": completed,
				"flowType":  "idpv",
			}); err != nil {
				return nil, err
			}
		}
		if nextStatus == "approved" {
			return &models.IDPVStatusResponse{
				Message:       "user validated",
				Status:        nextStatus,
				SessionID:     session.ID,
				Provider:      session.Provider,
				LastErrorCode: session.LastErrorCode,
				LastUpdatedAt: &session.UpdatedAt,
				CompletedAt:   session.CompletedAt,
			}, nil
		}
		return nil, ErrPhotoVerificationNotCompleted
	}
	return nil, ErrPhotoVerificationNotCompleted
}

func (s *userService) StartIDPV(ctx context.Context, actor models.AuthClaims, req *models.IDPVStartRequest) (*models.IDPVStartResponse, error) {
	userID, err := resolveVerificationTargetUserID(actor, req.PunterID)
	if err != nil {
		return nil, err
	}
	if _, err := s.users.GetUserByID(ctx, userID); err != nil {
		return nil, err
	}
	adapter := s.idComplyAdapter()
	sessionID := uuid.NewString()
	now := time.Now().UTC()
	redirectURL, providerReference, status := adapter.StartIDPV(sessionID, strings.TrimSpace(s.cfg.IDPVRedirectURL))
	session := &models.VerificationSession{
		ID:                sessionID,
		UserID:            userID,
		FlowType:          "idpv",
		Provider:          adapter.IDPVProvider(),
		Status:            status,
		RedirectURL:       redirectURL,
		ProviderReference: providerReference,
		ProviderDecision:  status,
		ProviderCaseID:    providerReference,
		UpdatedAt:         now,
	}
	if err := s.persistVerificationSession(ctx, nil, session); err != nil {
		return nil, err
	}
	if err := s.recordVerificationProviderEvent(ctx, session, "provider_start", status, map[string]any{
		"redirectUrl": redirectURL,
		"flowType":    "idpv",
	}); err != nil {
		return nil, err
	}
	if err := s.users.UpdateKYCStatus(ctx, userID, "pending"); err != nil {
		return nil, err
	}
	return &models.IDPVStartResponse{
		IDPVRedirectURL: redirectURL,
		SessionID:       sessionID,
	}, nil
}

func (s *userService) ChangePassword(ctx context.Context, actor models.AuthClaims, req *models.ChangePasswordRequest) (*models.PasswordActionResponse, error) {
	if actor.UserID == "" {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(req.CurrentPassword) == "" || strings.TrimSpace(req.NewPassword) == "" {
		return nil, ErrInvalidCredentials
	}
	user, err := s.users.GetUserByID(ctx, actor.UserID)
	if err != nil {
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return nil, ErrInvalidCredentials
	}
	if user.MFAEnabled {
		if err := s.verifyChallengeForUser(ctx, actor.UserID, req.VerificationID, req.VerificationCode); err != nil {
			return nil, err
		}
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}
	if err := s.users.UpdatePassword(ctx, actor.UserID, string(hash), time.Now().UTC()); err != nil {
		return nil, err
	}
	return &models.PasswordActionResponse{Status: "updated"}, nil
}

func (s *userService) ForgotPassword(ctx context.Context, req *models.ForgotPasswordRequest) (*models.PasswordActionResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}
	user, err := s.users.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return &models.PasswordActionResponse{Status: "accepted"}, nil
		}
		return nil, err
	}
	token := uuid.NewString()
	record := models.PasswordResetTokenRecord{
		Token:     token,
		UserID:    user.ID,
		Email:     user.Email,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.tokenStore.StorePasswordResetToken(ctx, token, record, s.cfg.PasswordResetTokenTTL); err != nil {
		return nil, err
	}
	return &models.PasswordActionResponse{Status: "accepted"}, nil
}

func (s *userService) ResetPassword(ctx context.Context, token string, req *models.ResetPasswordRequest) (*models.PasswordActionResponse, error) {
	resetToken := strings.TrimSpace(token)
	if resetToken == "" || strings.TrimSpace(req.Password) == "" {
		return nil, ErrInvalidCredentials
	}
	record, err := s.tokenStore.GetPasswordResetToken(ctx, resetToken)
	if err != nil {
		if errors.Is(err, repository.ErrTokenNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if err := s.verifyChallengeForUser(ctx, record.UserID, req.VerificationID, req.VerificationCode); err != nil {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}
	if err := s.users.UpdatePassword(ctx, record.UserID, string(hash), time.Now().UTC()); err != nil {
		return nil, err
	}
	if _, err := s.tokenStore.ConsumePasswordResetToken(ctx, resetToken); err != nil && !errors.Is(err, repository.ErrTokenNotFound) {
		s.logger.Warn("consume password reset token failed", slog.Any("error", err), slog.String("user_id", record.UserID))
	}
	return &models.PasswordActionResponse{Status: "updated"}, nil
}

func (s *userService) DeleteCurrentUser(ctx context.Context, actor models.AuthClaims) (*models.DeleteCurrentUserResponse, error) {
	if actor.UserID == "" {
		return nil, ErrForbidden
	}
	now := time.Now().UTC()
	if err := s.users.DeactivateUser(ctx, actor.UserID, now); err != nil {
		return nil, err
	}
	if err := s.users.EndCurrentSession(ctx, actor.UserID, now); err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	return &models.DeleteCurrentUserResponse{
		UserID: actor.UserID,
		Status: "deleted",
	}, nil
}

func (s *userService) ListAdminUsers(ctx context.Context, actor models.AuthClaims, filters models.UserFilters) (*models.ListUsersResponse, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.Limit < 1 || filters.Limit > 100 {
		filters.Limit = 25
	}
	users, total, err := s.users.ListUsers(ctx, filters)
	if err != nil {
		return nil, err
	}
	items := make([]*models.AdminUserSummary, 0, len(users))
	for _, user := range users {
		items = append(items, &models.AdminUserSummary{
			UserID:      user.ID,
			Email:       user.Email,
			Username:    user.Username,
			FirstName:   user.FirstName,
			LastName:    user.LastName,
			DateOfBirth: user.DateOfBirth,
			Role:        user.Role,
			Status:      user.PrimaryStatus(),
			KYCStatus:   user.PublicKYCStatus(),
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
		})
	}
	return &models.ListUsersResponse{
		Data: items,
		Pagination: models.Pagination{
			Page:  filters.Page,
			Limit: filters.Limit,
			Total: total,
		},
	}, nil
}

func (s *userService) GetAdminUser(ctx context.Context, actor models.AuthClaims, userID string) (*models.UserDetailResponse, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	user, err := s.users.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	roles, _, err := s.resolveRolesAndPermissions(ctx, user)
	if err != nil {
		return nil, err
	}
	return s.buildUserDetailResponse(ctx, user, roles)
}

func (s *userService) ApplyAdminUserLifecycle(ctx context.Context, actor models.AuthClaims, userID, action string, req *models.AdminUserLifecycleRequest) (*models.AdminUserLifecycleResponse, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	userID = strings.TrimSpace(userID)
	action = strings.TrimSpace(strings.ToLower(action))
	if userID == "" {
		return nil, fmt.Errorf("user id is required")
	}
	user, err := s.users.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if req == nil {
		req = &models.AdminUserLifecycleRequest{}
	}
	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		reason = strings.TrimSpace(req.Details)
	}
	performedAt := time.Now().UTC()

	switch action {
	case "suspend":
		if !user.IsActive {
			return nil, fmt.Errorf("punterIsSuspended")
		}
		if reason == "" {
			return nil, fmt.Errorf("reason is required")
		}
		if err := s.users.DeactivateUser(ctx, userID, performedAt); err != nil {
			return nil, err
		}
		if err := s.users.EndCurrentSession(ctx, userID, performedAt); err != nil && !errors.Is(err, repository.ErrNotFound) {
			return nil, err
		}
		user.IsActive = false
	case "unsuspend":
		if user.IsActive {
			return nil, fmt.Errorf("punterIsNotSuspended")
		}
		if err := s.users.ActivateUser(ctx, userID, performedAt); err != nil {
			return nil, err
		}
		user.IsActive = true
	case "logout":
		if err := s.users.EndCurrentSession(ctx, userID, performedAt); err != nil && !errors.Is(err, repository.ErrNotFound) {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported lifecycle action")
	}

	return &models.AdminUserLifecycleResponse{
		UserID:      userID,
		Action:      action,
		Status:      user.PrimaryStatus(),
		PerformedAt: performedAt,
	}, nil
}

func (s *userService) ListAdminUserSessions(ctx context.Context, actor models.AuthClaims, userID string, page, limit int) (*models.AdminUserSessionHistoryResponse, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	sessions, total, err := s.users.ListUserSessions(ctx, strings.TrimSpace(userID), page, limit)
	if err != nil {
		return nil, err
	}

	items := make([]models.AdminUserSessionHistoryItem, 0, len(sessions))
	for _, session := range sessions {
		items = append(items, models.AdminUserSessionHistoryItem{
			SessionID: session.ID,
			StartTime: session.StartedAt,
			EndTime:   session.EndedAt,
			Details:   sessionHistoryDetails(session),
		})
	}

	return &models.AdminUserSessionHistoryResponse{
		Data:         items,
		CurrentPage:  page,
		ItemsPerPage: limit,
		TotalCount:   total,
	}, nil
}

func (s *userService) ListVerificationSessions(ctx context.Context, actor models.AuthClaims, userID string) (*models.VerificationSessionListResponse, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	sessions, err := s.users.ListVerificationSessions(ctx, strings.TrimSpace(userID))
	if err != nil {
		return nil, err
	}
	return &models.VerificationSessionListResponse{Data: sessions}, nil
}

func (s *userService) GetVerificationSession(ctx context.Context, actor models.AuthClaims, sessionID string) (*models.VerificationSession, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return nil, fmt.Errorf("session id is required")
	}
	return s.users.GetVerificationSessionByID(ctx, sessionID)
}

func (s *userService) GetVerificationSessionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string) (*models.VerificationSession, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	providerReference = strings.TrimSpace(providerReference)
	if providerReference == "" {
		return nil, fmt.Errorf("provider reference is required")
	}
	return s.users.GetVerificationSessionByProviderReference(ctx, providerReference)
}

func (s *userService) GetVerificationSessionByProviderCaseID(ctx context.Context, actor models.AuthClaims, providerCaseID string) (*models.VerificationSession, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	providerCaseID = strings.TrimSpace(providerCaseID)
	if providerCaseID == "" {
		return nil, fmt.Errorf("provider case id is required")
	}
	return s.users.GetVerificationSessionByProviderCaseID(ctx, providerCaseID)
}

func (s *userService) ListVerificationReviewQueue(ctx context.Context, actor models.AuthClaims, provider, assignedTo, flowType, status string) (*models.VerificationReviewQueueResponse, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	sessions, err := s.users.ListVerificationReviewQueue(
		ctx,
		strings.TrimSpace(provider),
		strings.TrimSpace(assignedTo),
		strings.TrimSpace(flowType),
		strings.TrimSpace(status),
	)
	if err != nil {
		return nil, err
	}
	return &models.VerificationReviewQueueResponse{Data: sessions}, nil
}

func (s *userService) ExportVerificationReviewQueueCSV(ctx context.Context, actor models.AuthClaims, provider, assignedTo, flowType, status string) ([]byte, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	sessions, err := s.users.ListVerificationReviewQueue(
		ctx,
		strings.TrimSpace(provider),
		strings.TrimSpace(assignedTo),
		strings.TrimSpace(flowType),
		strings.TrimSpace(status),
	)
	if err != nil {
		return nil, err
	}
	return buildVerificationReviewQueueCSV(sessions)
}

func (s *userService) ListVerificationProviderEvents(ctx context.Context, actor models.AuthClaims, sessionID string) (*models.VerificationProviderEventListResponse, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	events, err := s.users.ListVerificationProviderEvents(ctx, strings.TrimSpace(sessionID))
	if err != nil {
		return nil, err
	}
	return &models.VerificationProviderEventListResponse{Data: events}, nil
}

func (s *userService) AssignVerificationSession(ctx context.Context, actor models.AuthClaims, sessionID string, req *models.VerificationAssignmentRequest) (*models.VerificationSession, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return nil, fmt.Errorf("session id is required")
	}
	if req == nil {
		return nil, fmt.Errorf("assignment request is required")
	}
	assignedTo := strings.TrimSpace(req.AssignedTo)
	reason := strings.TrimSpace(req.Reason)
	if assignedTo == "" && reason == "" {
		return nil, fmt.Errorf("assignment reason is required when clearing assignment")
	}
	return s.users.AssignVerificationSession(ctx, sessionID, assignedTo, reason)
}

func (s *userService) AddVerificationSessionNote(ctx context.Context, actor models.AuthClaims, sessionID string, req *models.VerificationNoteRequest) (*models.VerificationProviderEventListResponse, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return nil, fmt.Errorf("session id is required")
	}
	if req == nil || strings.TrimSpace(req.Note) == "" {
		return nil, fmt.Errorf("note is required")
	}
	events, err := s.users.AddVerificationSessionNote(ctx, sessionID, strings.TrimSpace(req.Note), actor.UserID)
	if err != nil {
		return nil, err
	}
	return &models.VerificationProviderEventListResponse{Data: events}, nil
}

func (s *userService) ApplyAdminVerificationDecision(ctx context.Context, actor models.AuthClaims, sessionID string, req *models.VerificationDecisionRequest) (*models.VerificationSession, error) {
	if !canAdminReadUsers(actor.Role) {
		return nil, ErrForbidden
	}
	return s.applyVerificationDecision(ctx, actor, sessionID, req)
}

func (s *userService) ApplyProviderVerificationUpdate(ctx context.Context, actor models.AuthClaims, sessionID string, req *models.ProviderVerificationStatusUpdateRequest) (*models.VerificationSession, error) {
	if !canAdminUpdateVerification(actor.Role) {
		return nil, ErrForbidden
	}
	session, err := s.users.GetVerificationSessionByID(ctx, strings.TrimSpace(sessionID))
	if err != nil {
		return nil, err
	}
	return s.applyProviderVerificationUpdateToSession(ctx, session, req.Status, req.LastErrorCode, req.Reason, req.ProviderRef, req.RedirectURL, req.Questions, req.Payload, "admin_update", actor.Role)
}

func (s *userService) ApplyProviderVerificationUpdateByReference(ctx context.Context, actor models.AuthClaims, req *models.ProviderVerificationStatusByReferenceRequest) (*models.VerificationSession, error) {
	if !canAdminUpdateVerification(actor.Role) {
		return nil, ErrForbidden
	}
	providerReference := strings.TrimSpace(req.ProviderReference)
	if providerReference == "" {
		return nil, fmt.Errorf("provider reference is required")
	}
	session, err := s.users.GetVerificationSessionByProviderReference(ctx, providerReference)
	if err != nil {
		return nil, err
	}
	return s.applyProviderVerificationUpdateToSession(ctx, session, req.Status, req.LastErrorCode, req.Reason, "", req.RedirectURL, req.Questions, req.Payload, "provider_callback", actor.Role)
}

func (s *userService) ApplyProviderVerificationUpdateByCaseID(ctx context.Context, actor models.AuthClaims, providerCaseID string, req *models.ProviderVerificationStatusUpdateRequest) (*models.VerificationSession, error) {
	if !canAdminUpdateVerification(actor.Role) {
		return nil, ErrForbidden
	}
	providerCaseID = strings.TrimSpace(providerCaseID)
	if providerCaseID == "" {
		return nil, fmt.Errorf("provider case id is required")
	}
	session, err := s.users.GetVerificationSessionByProviderCaseID(ctx, providerCaseID)
	if err != nil {
		return nil, err
	}
	return s.applyProviderVerificationUpdateToSession(ctx, session, req.Status, req.LastErrorCode, req.Reason, req.ProviderRef, req.RedirectURL, req.Questions, req.Payload, "provider_callback", actor.Role)
}

func (s *userService) ApplyProviderVerificationDecision(ctx context.Context, actor models.AuthClaims, sessionID string, req *models.VerificationDecisionRequest) (*models.VerificationSession, error) {
	if !canAdminUpdateVerification(actor.Role) {
		return nil, ErrForbidden
	}
	return s.applyVerificationDecision(ctx, actor, sessionID, req)
}

func (s *userService) applyVerificationDecision(ctx context.Context, actor models.AuthClaims, sessionID string, req *models.VerificationDecisionRequest) (*models.VerificationSession, error) {
	session, err := s.users.GetVerificationSessionByID(ctx, strings.TrimSpace(sessionID))
	if err != nil {
		return nil, err
	}
	status, err := normalizeVerificationDecisionInput(req.Decision)
	if err != nil {
		return nil, err
	}
	payload := clonePayloadMap(req.Payload)
	payload["decision"] = strings.TrimSpace(req.Decision)
	payload["reviewedByRole"] = actor.Role
	if strings.TrimSpace(req.Reason) != "" {
		payload["reviewReason"] = strings.TrimSpace(req.Reason)
	}
	return s.applyProviderVerificationUpdateToSession(ctx, session, status, "", req.Reason, "", "", req.Questions, payload, "admin_review", actor.Role)
}

func (s *userService) ApplyProviderVerificationDecisionByReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.VerificationDecisionRequest) (*models.VerificationSession, error) {
	if !canAdminUpdateVerification(actor.Role) {
		return nil, ErrForbidden
	}
	providerReference = strings.TrimSpace(providerReference)
	if providerReference == "" {
		return nil, fmt.Errorf("provider reference is required")
	}
	session, err := s.users.GetVerificationSessionByProviderReference(ctx, providerReference)
	if err != nil {
		return nil, err
	}
	return s.ApplyProviderVerificationDecision(ctx, actor, session.ID, req)
}

func (s *userService) ApplyProviderVerificationDecisionByCaseID(ctx context.Context, actor models.AuthClaims, providerCaseID string, req *models.VerificationDecisionRequest) (*models.VerificationSession, error) {
	if !canAdminUpdateVerification(actor.Role) {
		return nil, ErrForbidden
	}
	providerCaseID = strings.TrimSpace(providerCaseID)
	if providerCaseID == "" {
		return nil, fmt.Errorf("provider case id is required")
	}
	session, err := s.users.GetVerificationSessionByProviderCaseID(ctx, providerCaseID)
	if err != nil {
		return nil, err
	}
	return s.ApplyProviderVerificationDecision(ctx, actor, session.ID, req)
}

func (s *userService) applyProviderVerificationUpdateToSession(ctx context.Context, session *models.VerificationSession, status, lastErrorCode, reason, providerRef, redirectURL string, questions []models.KBAQuestion, payload map[string]any, source, actorRole string) (*models.VerificationSession, error) {
	nextStatus, err := normalizeProviderVerificationStatus(status, payload)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	session.Status = nextStatus
	session.LastErrorCode = strings.TrimSpace(lastErrorCode)
	if strings.TrimSpace(providerRef) != "" {
		session.ProviderReference = strings.TrimSpace(providerRef)
	}
	session.ProviderDecision = normalizeProviderDecision(payload, nextStatus, session.ProviderDecision)
	session.ProviderCaseID = normalizeProviderCaseID(payload, session.ProviderCaseID, session.ProviderReference)
	if strings.TrimSpace(redirectURL) != "" {
		session.RedirectURL = strings.TrimSpace(redirectURL)
	}
	if len(questions) > 0 {
		session.Questions = questions
	}
	session.UpdatedAt = now
	switch nextStatus {
	case "approved", "rejected", "failed":
		session.CompletedAt = &now
	case "pending_review", "provider_reviewing", "submitted_to_provider", "questions_presented":
		session.CompletedAt = nil
	default:
		return nil, fmt.Errorf("unsupported provider status: %s", nextStatus)
	}
	if err := s.users.UpdateVerificationSession(ctx, session); err != nil {
		return nil, err
	}
	eventPayload := map[string]any{
		"lastErrorCode": session.LastErrorCode,
		"actorRole":     actorRole,
	}
	if strings.TrimSpace(session.ProviderReference) != "" {
		eventPayload["providerReference"] = session.ProviderReference
	}
	if strings.TrimSpace(session.ProviderDecision) != "" {
		eventPayload["providerDecision"] = session.ProviderDecision
	}
	if strings.TrimSpace(session.ProviderCaseID) != "" {
		eventPayload["providerCaseId"] = session.ProviderCaseID
	}
	if strings.TrimSpace(session.RedirectURL) != "" {
		eventPayload["redirectUrl"] = session.RedirectURL
	}
	if len(session.Questions) > 0 {
		eventPayload["questionCount"] = len(session.Questions)
	}
	for key, value := range payload {
		eventPayload[key] = value
	}
	if err := s.recordVerificationProviderEvent(ctx, session, source, firstNonEmpty(strings.TrimSpace(reason), nextStatus), eventPayload); err != nil {
		return nil, err
	}
	if session.CompletedAt != nil {
		switch session.Status {
		case "approved":
			if err := s.users.UpdateKYCStatus(ctx, session.UserID, "verified"); err != nil {
				return nil, err
			}
		case "rejected", "failed":
			if err := s.users.UpdateKYCStatus(ctx, session.UserID, "rejected"); err != nil {
				return nil, err
			}
		}
	}
	return session, nil
}

func normalizeProviderVerificationStatus(status string, payload map[string]any) (string, error) {
	candidate := strings.ToLower(strings.TrimSpace(status))
	if candidate == "" {
		candidate = firstNonEmpty(stringPayload(payload, "providerDecision"), stringPayload(payload, "decision"), stringPayload(payload, "providerStatus"))
		candidate = strings.ToLower(strings.TrimSpace(candidate))
	}
	switch candidate {
	case "approved", "passed", "verified", "complete", "completed", "success", "succeeded":
		return "approved", nil
	case "rejected", "declined", "denied":
		return "rejected", nil
	case "failed", "error", "errored":
		return "failed", nil
	case "pending_review", "review", "manual_review", "pending":
		return "pending_review", nil
	case "provider_reviewing", "reviewing", "in_progress":
		return "provider_reviewing", nil
	case "submitted_to_provider", "submitted":
		return "submitted_to_provider", nil
	case "questions_presented", "questionnaire", "questions":
		return "questions_presented", nil
	case "":
		return "", fmt.Errorf("status is required")
	default:
		return "", fmt.Errorf("unsupported provider status: %s", candidate)
	}
}

func normalizeVerificationDecisionInput(decision string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(decision)) {
	case "approve", "approved", "verified", "pass":
		return "approved", nil
	case "reject", "rejected", "deny", "denied", "fail", "failed":
		return "rejected", nil
	case "review", "pending_review", "manual_review", "escalate":
		return "pending_review", nil
	case "questionnaire", "questions", "questions_presented":
		return "questions_presented", nil
	case "":
		return "", fmt.Errorf("decision is required")
	default:
		return "", fmt.Errorf("unsupported verification decision: %s", strings.TrimSpace(decision))
	}
}

func buildVerificationReviewQueueCSV(sessions []*models.VerificationSession) ([]byte, error) {
	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	if err := writer.Write([]string{
		"session_id",
		"user_id",
		"flow_type",
		"provider",
		"status",
		"provider_reference",
		"provider_case_id",
		"provider_decision",
		"last_error_code",
		"assigned_to",
		"assigned_at",
		"created_at",
		"updated_at",
		"completed_at",
	}); err != nil {
		return nil, err
	}
	for _, session := range sessions {
		if err := writer.Write([]string{
			session.ID,
			session.UserID,
			session.FlowType,
			session.Provider,
			session.Status,
			session.ProviderReference,
			session.ProviderCaseID,
			session.ProviderDecision,
			session.LastErrorCode,
			session.AssignedTo,
			formatOptionalTime(session.AssignedAt),
			session.CreatedAt.Format(time.RFC3339),
			session.UpdatedAt.Format(time.RFC3339),
			formatOptionalTime(session.CompletedAt),
		}); err != nil {
			return nil, err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func formatOptionalTime(value *time.Time) string {
	if value == nil {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func clonePayloadMap(payload map[string]any) map[string]any {
	if len(payload) == 0 {
		return map[string]any{}
	}
	cloned := make(map[string]any, len(payload))
	for key, value := range payload {
		cloned[key] = value
	}
	return cloned
}

func stringPayload(payload map[string]any, key string) string {
	if payload == nil {
		return ""
	}
	raw, ok := payload[key]
	if !ok {
		return ""
	}
	switch value := raw.(type) {
	case string:
		return value
	default:
		return fmt.Sprint(value)
	}
}

func normalizeProviderDecision(payload map[string]any, normalizedStatus, existing string) string {
	candidate := firstNonEmpty(
		stringPayload(payload, "providerDecision"),
		stringPayload(payload, "decision"),
		stringPayload(payload, "result"),
	)
	if strings.TrimSpace(candidate) != "" {
		return strings.TrimSpace(candidate)
	}
	if strings.TrimSpace(existing) != "" {
		return strings.TrimSpace(existing)
	}
	return strings.TrimSpace(normalizedStatus)
}

func normalizeProviderCaseID(payload map[string]any, existing, providerReference string) string {
	candidate := firstNonEmpty(
		stringPayload(payload, "providerCaseId"),
		stringPayload(payload, "caseId"),
		stringPayload(payload, "case_id"),
		stringPayload(payload, "referenceId"),
	)
	if strings.TrimSpace(candidate) != "" {
		return strings.TrimSpace(candidate)
	}
	return firstNonEmpty(existing, providerReference)
}

func (s *userService) GetUser(ctx context.Context, actor models.AuthClaims, userID string) (*models.UserDetailResponse, error) {
	if actor.UserID != userID && actor.Role != "admin" {
		return nil, ErrForbidden
	}
	user, err := s.users.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	roles, _, err := s.resolveRolesAndPermissions(ctx, user)
	if err != nil {
		return nil, err
	}
	return s.buildUserDetailResponse(ctx, user, roles)
}

func (s *userService) buildUserDetailResponse(ctx context.Context, user *models.User, roles []string) (*models.UserDetailResponse, error) {
	lastSession, err := s.users.GetLatestSession(ctx, user.ID)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	hasToAcceptTerms, acceptance, _, err := s.resolveTermsStatus(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	preferences, err := s.users.GetUserPreferences(ctx, user.ID)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	if preferences == nil {
		preferences = defaultUserPreferences(user.ID)
	}
	hasAcceptedResponsibilityCheck, err := s.users.HasAcceptedResponsibilityCheck(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	response := &models.UserDetailResponse{
		UserID:                           user.ID,
		Email:                            user.Email,
		Username:                         user.Username,
		FirstName:                        user.FirstName,
		LastName:                         user.LastName,
		Status:                           user.PrimaryStatus(),
		KYCStatus:                        user.PublicKYCStatus(),
		Roles:                            roles,
		CreatedAt:                        user.CreatedAt,
		UpdatedAt:                        user.UpdatedAt,
		SignUpDate:                       user.CreatedAt,
		SignUpDateV1:                     user.CreatedAt,
		CommunicationPreferences:         preferences.CommunicationPreferences,
		BettingPreferences:               preferences.BettingPreferences,
		HasToAcceptTerms:                 hasToAcceptTerms,
		HasToAcceptResponsibilityCheck:   !hasAcceptedResponsibilityCheck,
		TwoFactorAuthEnabled:             user.MFAEnabled,
		VerifiedAt:                       user.PhoneVerifiedAt,
		HasToAcceptTermsV1:               hasToAcceptTerms,
		HasToAcceptResponsibilityCheckV1: !hasAcceptedResponsibilityCheck,
	}
	if lastSession != nil {
		response.LastSignIn = &lastSession.StartedAt
		response.LastSignInV1 = &lastSession.StartedAt
	}
	if acceptance != nil {
		response.Terms = &models.TermsAcceptanceInfo{
			AcceptedAt:   acceptance.AcceptedAt,
			Version:      acceptance.Version,
			AcceptedAtV1: acceptance.AcceptedAt,
		}
	}
	return response, nil
}

func (s *userService) UpdateUser(ctx context.Context, actor models.AuthClaims, userID string, req *models.UpdateUserRequest) (*models.UpdateUserResponse, error) {
	if actor.UserID != userID && actor.Role != "admin" {
		return nil, ErrForbidden
	}
	user, err := s.users.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if email := strings.ToLower(strings.TrimSpace(req.Email)); email != "" && email != strings.ToLower(user.Email) {
		existing, err := s.users.GetUserByEmail(ctx, email)
		if err == nil && existing.ID != user.ID {
			return nil, fmt.Errorf("email already registered")
		}
		if err != nil && !errors.Is(err, repository.ErrNotFound) {
			return nil, err
		}
		user.Email = email
	}
	if req.FirstName != "" {
		user.FirstName = strings.TrimSpace(req.FirstName)
	}
	if req.LastName != "" {
		user.LastName = strings.TrimSpace(req.LastName)
	}
	if req.Phone != "" {
		user.Phone = strings.TrimSpace(req.Phone)
	}
	if req.Country != "" {
		user.Country = strings.ToUpper(strings.TrimSpace(req.Country))
	}
	if req.State != "" {
		user.State = strings.TrimSpace(req.State)
	}
	user.UpdatedAt = time.Now().UTC()
	if err := s.users.UpdateUser(ctx, user); err != nil {
		return nil, err
	}
	return &models.UpdateUserResponse{UserID: user.ID, UpdatedAt: user.UpdatedAt}, nil
}

func (s *userService) UpdatePreferences(ctx context.Context, actor models.AuthClaims, req *models.UpdatePreferencesRequest) (*models.UserPreferences, error) {
	if actor.UserID == "" {
		return nil, ErrForbidden
	}
	preferences := &models.UserPreferences{
		UserID:                   actor.UserID,
		CommunicationPreferences: req.CommunicationPreferences,
		BettingPreferences:       req.BettingPreferences,
		UpdatedAt:                time.Now().UTC(),
	}
	if err := s.users.UpsertUserPreferences(ctx, preferences); err != nil {
		return nil, err
	}
	return preferences, nil
}

func (s *userService) UpdateMFA(ctx context.Context, actor models.AuthClaims, req *models.UpdateMFAEnabledStatusRequest) error {
	if actor.UserID == "" {
		return ErrForbidden
	}
	if strings.TrimSpace(req.VerificationID) == "" || strings.TrimSpace(req.VerificationCode) == "" {
		return fmt.Errorf("verification id and code are required")
	}
	challenge, err := s.tokenStore.ApproveVerificationChallenge(ctx, strings.TrimSpace(req.VerificationID), strings.TrimSpace(req.VerificationCode))
	if err != nil {
		if errors.Is(err, repository.ErrTokenNotFound) {
			return fmt.Errorf("incorrect mfa verification")
		}
		return err
	}
	if challenge.UserID != actor.UserID {
		return ErrForbidden
	}
	return s.users.UpdateMFAEnabled(ctx, actor.UserID, req.Enabled, time.Now().UTC())
}

func (s *userService) SubmitKYC(ctx context.Context, actor models.AuthClaims, req *models.KYCSubmitRequest) (*models.KYCSubmitResponse, error) {
	if actor.UserID == "" {
		return nil, ErrForbidden
	}
	if err := s.users.UpdateKYCStatus(ctx, actor.UserID, "pending"); err != nil {
		return nil, err
	}
	return &models.KYCSubmitResponse{UserID: actor.UserID, KYCStatus: "pending_review", SubmissionID: uuid.NewString()}, nil
}

func (s *userService) GetRoles(ctx context.Context, actor models.AuthClaims, userID string) (*models.RolesResponse, error) {
	if actor.Role != "admin" && actor.UserID != userID {
		return nil, ErrForbidden
	}
	user, err := s.users.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	roles, _, err := s.resolveRolesAndPermissions(ctx, user)
	if err != nil {
		return nil, err
	}
	items := make([]models.RoleDetails, 0, len(roles))
	for _, role := range roles {
		items = append(items, models.RoleDetails{Name: role, Permissions: permissionMap[role]})
	}
	return &models.RolesResponse{UserID: userID, Roles: items}, nil
}

func (s *userService) AssignRole(ctx context.Context, actor models.AuthClaims, userID string, roleName string) (*models.AssignRoleResponse, error) {
	if actor.Role != "admin" {
		return nil, ErrForbidden
	}
	user, err := s.users.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	roleName = strings.ToLower(strings.TrimSpace(roleName))
	switch roleName {
	case "admin", "moderator", "user", "guest":
		user.Role = roleName
		user.UpdatedAt = time.Now().UTC()
		if err := s.users.UpdateUser(ctx, user); err != nil {
			return nil, err
		}
	case "affiliate":
		hasCode, err := s.users.HasReferralCode(ctx, userID)
		if err != nil {
			return nil, err
		}
		if !hasCode {
			code := buildReferralCode(s.cfg.DefaultReferralPrefix, user.Username)
			if err := s.users.CreateReferralCode(ctx, userID, code); err != nil {
				return nil, err
			}
		}
	default:
		return nil, fmt.Errorf("unsupported role: %s", roleName)
	}
	return &models.AssignRoleResponse{UserID: userID, Role: roleName, AssignedAt: time.Now().UTC()}, nil
}

func (s *userService) GetPermissions(ctx context.Context, actor models.AuthClaims, userID string) (*models.PermissionSet, error) {
	if actor.Role != "admin" && actor.UserID != userID {
		return nil, ErrForbidden
	}
	user, err := s.users.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	_, permissions, err := s.resolveRolesAndPermissions(ctx, user)
	if err != nil {
		return nil, err
	}
	return &models.PermissionSet{UserID: userID, Permissions: permissions}, nil
}

func (s *userService) GetCurrentSession(ctx context.Context, actor models.AuthClaims) (*models.CurrentSessionResponse, error) {
	if actor.UserID == "" {
		return nil, ErrForbidden
	}
	session, err := s.users.GetCurrentSession(ctx, actor.UserID)
	if err != nil {
		return nil, err
	}
	hasAcceptedResponsibilityCheck, err := s.users.HasAcceptedResponsibilityCheck(ctx, actor.UserID)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	return &models.CurrentSessionResponse{
		SessionID:                        session.ID,
		SessionStartTime:                 session.StartedAt,
		CurrentTime:                      now,
		DeviceID:                         session.DeviceID,
		DeviceFingerprint:                session.DeviceFingerprint,
		HasToAcceptResponsibilityCheck:   !hasAcceptedResponsibilityCheck,
		SessionIDV1:                      session.ID,
		SessionStartV1:                   session.StartedAt,
		CurrentTimeV1:                    now,
		HasToAcceptResponsibilityCheckV1: !hasAcceptedResponsibilityCheck,
	}, nil
}

func (s *userService) AcceptTerms(ctx context.Context, actor models.AuthClaims, req *models.AcceptTermsRequest) (*models.AcceptTermsResponse, error) {
	if actor.UserID == "" {
		return nil, ErrForbidden
	}
	currentTerms, err := s.users.GetCurrentTerms(ctx)
	if err != nil {
		return nil, err
	}
	version := strings.TrimSpace(req.Version)
	if version == "" {
		version = strings.TrimSpace(req.CurrentTermsVersion)
	}
	if version == "" {
		version = strings.TrimSpace(req.CurrentTermsVersionV1)
	}
	if version == "" {
		version = currentTerms.CurrentTermsVersion
	}
	if version != currentTerms.CurrentTermsVersion {
		return nil, fmt.Errorf("terms version mismatch")
	}
	acceptedAt := time.Now().UTC()
	acceptance := &models.UserTermsAcceptance{
		UserID:     actor.UserID,
		Version:    version,
		AcceptedAt: acceptedAt,
	}
	if err := s.users.AcceptTerms(ctx, acceptance); err != nil {
		return nil, err
	}
	return &models.AcceptTermsResponse{
		UserID: actor.UserID,
		Terms: models.TermsAcceptanceInfo{
			AcceptedAt:   acceptedAt,
			Version:      version,
			AcceptedAtV1: acceptedAt,
		},
		HasToAcceptTerms:   false,
		UserIDV1:           actor.UserID,
		HasToAcceptTermsV1: false,
	}, nil
}

func (s *userService) verifyChallengeForUser(ctx context.Context, userID, verificationID, verificationCode string) error {
	id := strings.TrimSpace(verificationID)
	code := strings.TrimSpace(verificationCode)
	if id == "" || code == "" {
		return fmt.Errorf("verification id and code are required")
	}
	challenge, err := s.tokenStore.ApproveVerificationChallenge(ctx, id, code)
	if err != nil {
		if errors.Is(err, repository.ErrTokenNotFound) {
			return fmt.Errorf("incorrect mfa verification")
		}
		return err
	}
	if challenge.UserID != userID {
		return ErrForbidden
	}
	if shouldMarkPhoneVerified(challenge.Purpose) {
		if err := s.users.MarkPhoneVerified(ctx, userID, time.Now().UTC()); err != nil {
			return err
		}
	}
	return nil
}

func shouldMarkPhoneVerified(purpose string) bool {
	switch purpose {
	case "phone_verification", "email_verified_login", "mfa_login":
		return true
	default:
		return false
	}
}

func canAdminReadUsers(role string) bool {
	switch role {
	case "admin", "operator", "trader":
		return true
	default:
		return false
	}
}

func sessionHistoryDetails(session *models.UserSession) map[string]any {
	details := map[string]any{}
	if session == nil {
		return details
	}
	if value := strings.TrimSpace(session.IPAddress); value != "" {
		details["ipAddress"] = value
	}
	if value := strings.TrimSpace(session.UserAgent); value != "" {
		details["userAgent"] = value
	}
	if value := strings.TrimSpace(session.DeviceID); value != "" {
		details["deviceId"] = value
	}
	if value := strings.TrimSpace(session.DeviceFingerprint); value != "" {
		details["deviceFingerprint"] = value
	}
	return details
}

func canAdminUpdateVerification(role string) bool {
	switch role {
	case "admin", "internal", "data-provider":
		return true
	default:
		return false
	}
}

func (s *userService) lookupUser(ctx context.Context, identifier string) (*models.User, error) {
	if strings.Contains(identifier, "@") {
		return s.users.GetUserByEmail(ctx, identifier)
	}
	return s.users.GetUserByUsername(ctx, identifier)
}

func (s *userService) resolveRolesAndPermissions(ctx context.Context, user *models.User) ([]string, []string, error) {
	roles := []string{user.Role}
	hasReferralCode, err := s.users.HasReferralCode(ctx, user.ID)
	if err != nil {
		return nil, nil, err
	}
	if hasReferralCode {
		roles = append(roles, "affiliate")
	}
	permissionsSet := map[string]struct{}{}
	for _, role := range roles {
		for _, permission := range permissionMap[role] {
			permissionsSet[permission] = struct{}{}
		}
	}
	permissions := make([]string, 0, len(permissionsSet))
	for permission := range permissionsSet {
		permissions = append(permissions, permission)
	}
	sort.Strings(roles)
	sort.Strings(permissions)
	return roles, permissions, nil
}

func (s *userService) issueAccessToken(user *models.User, permissions []string) (string, error) {
	now := time.Now().UTC()
	claims := jwt.MapClaims{
		"user_id":     user.ID,
		"email":       user.Email,
		"username":    user.Username,
		"role":        user.Role,
		"permissions": permissions,
		"iss":         s.cfg.JWTIssuer,
		"aud":         s.cfg.JWTAudience,
		"iat":         now.Unix(),
		"exp":         now.Add(s.cfg.AccessTokenTTL).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *userService) buildLoginResponse(user *models.User, accessToken, refreshToken, sessionID string, hasToAcceptTerms bool, lastSignIn *time.Time) *models.LoginResponse {
	return &models.LoginResponse{
		User: models.UserSummary{
			UserID:    user.ID,
			Email:     user.Email,
			Username:  user.Username,
			CreatedAt: user.CreatedAt,
			Status:    user.PrimaryStatus(),
		},
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		ExpiresIn:        int64(s.cfg.AccessTokenTTL.Seconds()),
		SessionID:        sessionID,
		HasToAcceptTerms: hasToAcceptTerms,
		LastSignIn:       lastSignIn,
		Token: models.TokenBundle{
			Token:            accessToken,
			RefreshToken:     refreshToken,
			ExpiresIn:        int64(s.cfg.AccessTokenTTL.Seconds()),
			RefreshExpiresIn: int64(s.cfg.RefreshTokenTTL.Seconds()),
			TokenType:        "Bearer",
			UserID:           user.ID,
		},
		HasToAcceptTermsV1: hasToAcceptTerms,
		SessionIDV1:        sessionID,
		LastSignInV1:       lastSignIn,
		Type:               "LOGGED_IN",
	}
}

func (s *userService) finishAuthentication(ctx context.Context, user *models.User, ipAddress, userAgent, deviceID, deviceFingerprint string) (*models.LoginResponse, error) {
	_, permissions, err := s.resolveRolesAndPermissions(ctx, user)
	if err != nil {
		return nil, err
	}
	accessToken, err := s.issueAccessToken(user, permissions)
	if err != nil {
		return nil, err
	}
	refreshToken := uuid.NewString()
	if err := s.tokenStore.StoreRefreshToken(ctx, refreshToken, user.ID, s.cfg.RefreshTokenTTL); err != nil {
		return nil, err
	}
	lastSession, err := s.users.GetLatestSession(ctx, user.ID)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	now := time.Now().UTC()
	session := &models.UserSession{
		ID:                uuid.NewString(),
		UserID:            user.ID,
		StartedAt:         now,
		IPAddress:         ipAddress,
		UserAgent:         userAgent,
		DeviceID:          deviceID,
		DeviceFingerprint: deviceFingerprint,
	}
	if err := s.users.CreateSession(ctx, session); err != nil {
		return nil, err
	}
	hasToAcceptTerms, _, _, err := s.resolveTermsStatus(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	var lastSignIn *time.Time
	if lastSession != nil {
		lastSignIn = &lastSession.StartedAt
	}
	return s.buildLoginResponse(user, accessToken, refreshToken, session.ID, hasToAcceptTerms, lastSignIn), nil
}

func normalizeDeviceFingerprint(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(typed)
	default:
		encoded, err := json.Marshal(typed)
		if err != nil {
			return strings.TrimSpace(fmt.Sprint(typed))
		}
		return strings.TrimSpace(string(encoded))
	}
}

func defaultUserPreferences(userID string) *models.UserPreferences {
	return &models.UserPreferences{
		UserID: userID,
		CommunicationPreferences: models.CommunicationPreferences{
			Announcements:       true,
			Promotions:          true,
			SubscriptionUpdates: false,
			SignInNotifications: true,
		},
		BettingPreferences: models.BettingPreferences{
			AutoAcceptBetterOdds: false,
		},
	}
}

func resolveVerificationTargetUserID(actor models.AuthClaims, provided string) (string, error) {
	if actor.UserID != "" {
		return actor.UserID, nil
	}
	if id := strings.TrimSpace(provided); id != "" {
		return id, nil
	}
	return "", ErrForbidden
}

func (s *userService) persistVerificationSession(ctx context.Context, current *models.VerificationSession, next *models.VerificationSession) error {
	now := next.UpdatedAt
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if current == nil {
		next.CreatedAt = now
		next.UpdatedAt = now
		return s.users.CreateVerificationSession(ctx, next)
	}
	current.Provider = next.Provider
	current.Status = next.Status
	current.Questions = next.Questions
	current.Answers = next.Answers
	current.RedirectURL = next.RedirectURL
	current.ProviderReference = next.ProviderReference
	current.ProviderDecision = next.ProviderDecision
	current.ProviderCaseID = next.ProviderCaseID
	current.LastErrorCode = next.LastErrorCode
	current.UpdatedAt = now
	current.CompletedAt = next.CompletedAt
	return s.users.UpdateVerificationSession(ctx, current)
}

func (s *userService) idComplyAdapter() *idcomply.Adapter {
	return idcomply.New(s.cfg.KBAProvider, s.cfg.IDPVProvider)
}

func (s *userService) recordVerificationProviderEvent(ctx context.Context, session *models.VerificationSession, source, reason string, payload map[string]any) error {
	if session == nil || strings.TrimSpace(session.ID) == "" {
		return nil
	}
	return s.users.CreateVerificationProviderEvent(ctx, &models.VerificationProviderEvent{
		ID:                    uuid.NewString(),
		VerificationSessionID: session.ID,
		Provider:              session.Provider,
		Status:                session.Status,
		Source:                source,
		Reason:                strings.TrimSpace(reason),
		Payload:               payload,
		CreatedAt:             time.Now().UTC(),
	})
}

func verificationSessionID(session *models.VerificationSession) string {
	if session == nil {
		return ""
	}
	return session.ID
}

func verificationSessionProvider(session *models.VerificationSession) string {
	if session == nil {
		return ""
	}
	return session.Provider
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func verificationSessionUpdatedAt(session *models.VerificationSession) *time.Time {
	if session == nil {
		return nil
	}
	updatedAt := session.UpdatedAt
	return &updatedAt
}

func verificationSessionCompletedAt(session *models.VerificationSession) *time.Time {
	if session == nil {
		return nil
	}
	return session.CompletedAt
}

func (s *userService) resolveTermsStatus(ctx context.Context, userID string) (bool, *models.UserTermsAcceptance, *models.TermsDocument, error) {
	currentTerms, err := s.users.GetCurrentTerms(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return false, nil, nil, nil
		}
		return false, nil, nil, err
	}
	acceptance, err := s.users.GetLatestTermsAcceptance(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return true, nil, currentTerms, nil
		}
		return false, nil, nil, err
	}
	return acceptance.Version != currentTerms.CurrentTermsVersion, acceptance, currentTerms, nil
}

func (s *userService) createVerificationChallenge(ctx context.Context, userID, phone, purpose string) (*models.VerificationRequestByCodeResponse, error) {
	code, err := generateVerificationCode()
	if err != nil {
		return nil, err
	}
	record := models.VerificationChallengeRecord{
		ID:          uuid.NewString(),
		UserID:      userID,
		Code:        code,
		PhoneNumber: strings.TrimSpace(phone),
		Purpose:     purpose,
		CreatedAt:   time.Now().UTC(),
	}
	if err := s.tokenStore.StoreVerificationChallenge(ctx, record, s.cfg.VerificationCodeTTL); err != nil {
		return nil, err
	}
	return &models.VerificationRequestByCodeResponse{VerificationID: record.ID}, nil
}

func generateVerificationCode() (string, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", value.Int64()), nil
}

func buildReferralCode(prefix, username string) string {
	username = strings.ToUpper(strings.TrimSpace(username))
	username = strings.ReplaceAll(username, " ", "")
	if len(username) > 8 {
		username = username[:8]
	}
	return fmt.Sprintf("%s_%s", strings.ToUpper(prefix), username)
}

var permissionMap = map[string][]string{
	"admin":     {"manage_users", "manage_wallet", "manage_reporting", "manage_compliance", "view_markets", "place_bets"},
	"moderator": {"view_users", "manage_compliance", "manage_wallet", "view_markets"},
	"user":      {"place_bets", "view_markets", "manage_wallet", "view_profile"},
	"guest":     {"view_markets"},
	"affiliate": {"view_referrals", "claim_rewards"},
}
