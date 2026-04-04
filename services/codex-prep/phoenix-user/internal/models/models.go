package models

import (
	"time"
)

type User struct {
	ID              string     `json:"user_id" db:"id"`
	Email           string     `json:"email" db:"email"`
	Username        string     `json:"username" db:"username"`
	PasswordHash    string     `json:"-" db:"password_hash"`
	Role            string     `json:"role" db:"role"`
	KYCStatus       string     `json:"kyc_status" db:"kyc_status"`
	FirstName       string     `json:"first_name,omitempty" db:"first_name"`
	LastName        string     `json:"last_name,omitempty" db:"last_name"`
	DateOfBirth     *time.Time `json:"date_of_birth,omitempty" db:"date_of_birth"`
	Phone           string     `json:"phone,omitempty" db:"phone"`
	Country         string     `json:"country,omitempty" db:"country"`
	State           string     `json:"state,omitempty" db:"state"`
	MFAEnabled      bool       `json:"mfa_enabled" db:"mfa_enabled"`
	IsActive        bool       `json:"-" db:"is_active"`
	IsVerified      bool       `json:"-" db:"is_verified"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty" db:"email_verified_at"`
	PhoneVerifiedAt *time.Time `json:"phone_verified_at,omitempty" db:"phone_verified_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

type RegisterRequest struct {
	Email       string `json:"email"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	DateOfBirth string `json:"date_of_birth"`
	Country     string `json:"country"`
}

type RegisterResponse struct {
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
	Status    string    `json:"status"`
}

type LoginRequest struct {
	Identifier        string `json:"identifier"`
	Email             string `json:"email"`
	Username          string `json:"username"`
	Password          string `json:"password"`
	DeviceID          string `json:"device_id,omitempty"`
	DeviceFingerprint string `json:"deviceFingerprint,omitempty"`
	IPAddress         string `json:"-"`
	UserAgent         string `json:"-"`
}

type LoginResponse struct {
	User               UserSummary `json:"user"`
	AccessToken        string      `json:"access_token"`
	RefreshToken       string      `json:"refresh_token"`
	ExpiresIn          int64       `json:"expires_in"`
	SessionID          string      `json:"session_id,omitempty"`
	VerificationID     string      `json:"verificationId,omitempty"`
	HasToAcceptTerms   bool        `json:"has_to_accept_terms"`
	LastSignIn         *time.Time  `json:"last_sign_in,omitempty"`
	Token              TokenBundle `json:"token"`
	HasToAcceptTermsV1 bool        `json:"hasToAcceptTerms"`
	SessionIDV1        string      `json:"sessionId,omitempty"`
	LastSignInV1       *time.Time  `json:"lastSignIn,omitempty"`
	Type               string      `json:"type"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type RefreshResponse struct {
	AccessToken        string      `json:"access_token"`
	RefreshToken       string      `json:"refresh_token"`
	ExpiresIn          int64       `json:"expires_in"`
	HasToAcceptTerms   bool        `json:"has_to_accept_terms"`
	Token              TokenBundle `json:"token"`
	HasToAcceptTermsV1 bool        `json:"hasToAcceptTerms"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type CurrentSessionResponse struct {
	SessionID                        string    `json:"session_id"`
	SessionStartTime                 time.Time `json:"session_start_time"`
	CurrentTime                      time.Time `json:"current_time"`
	DeviceID                         string    `json:"device_id,omitempty"`
	DeviceFingerprint                string    `json:"deviceFingerprint,omitempty"`
	HasToAcceptResponsibilityCheck   bool      `json:"has_to_accept_responsibility_check"`
	SessionIDV1                      string    `json:"sessionId"`
	SessionStartV1                   time.Time `json:"sessionStartTime"`
	CurrentTimeV1                    time.Time `json:"currentTime"`
	HasToAcceptResponsibilityCheckV1 bool      `json:"hasToAcceptResponsibilityCheck"`
}

type AcceptTermsRequest struct {
	Version               string `json:"version,omitempty"`
	CurrentTermsVersion   string `json:"current_terms_version,omitempty"`
	CurrentTermsVersionV1 string `json:"currentTermsVersion,omitempty"`
}

type TermsAcceptanceInfo struct {
	AcceptedAt   time.Time `json:"accepted_at"`
	Version      string    `json:"version"`
	AcceptedAtV1 time.Time `json:"acceptedAt"`
}

type AcceptTermsResponse struct {
	UserID             string              `json:"user_id"`
	Terms              TermsAcceptanceInfo `json:"terms"`
	HasToAcceptTerms   bool                `json:"has_to_accept_terms"`
	UserIDV1           string              `json:"userId"`
	HasToAcceptTermsV1 bool                `json:"hasToAcceptTerms"`
}

type VerificationRequest struct {
	PhoneNumber       string `json:"phoneNumber,omitempty"`
	DeviceFingerprint any    `json:"deviceFingerprint,omitempty"`
}

type VerificationRequestByCodeResponse struct {
	VerificationID string `json:"verificationId"`
}

type VerificationCheckRequest struct {
	ID               string `json:"id,omitempty"`
	VerificationID   string `json:"verificationId,omitempty"`
	Code             string `json:"code,omitempty"`
	VerificationCode string `json:"verificationCode,omitempty"`
}

type VerificationCheckResponse struct {
	VerificationID string `json:"verificationId"`
	Approved       bool   `json:"approved"`
	Status         string `json:"status"`
}

type LoginWithVerificationRequest struct {
	Username          string `json:"username"`
	Password          string `json:"password"`
	VerificationID    string `json:"verificationId"`
	VerificationCode  string `json:"verificationCode"`
	DeviceID          string `json:"device_id,omitempty"`
	DeviceFingerprint any    `json:"deviceFingerprint,omitempty"`
	IPAddress         string `json:"-"`
	UserAgent         string `json:"-"`
}

type UpdateMFAEnabledStatusRequest struct {
	Enabled          bool   `json:"enabled"`
	VerificationID   string `json:"verificationId"`
	VerificationCode string `json:"verificationCode"`
}

type ChangePasswordRequest struct {
	CurrentPassword  string `json:"currentPassword"`
	NewPassword      string `json:"newPassword"`
	VerificationID   string `json:"verificationId"`
	VerificationCode string `json:"verificationCode"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Password         string `json:"password"`
	VerificationID   string `json:"verificationId"`
	VerificationCode string `json:"verificationCode"`
}

type PasswordActionResponse struct {
	Status string `json:"status"`
}

type DeleteCurrentUserResponse struct {
	UserID string `json:"user_id"`
	Status string `json:"status"`
}

type AdminUserLifecycleRequest struct {
	Entity  string `json:"entity,omitempty"`
	Details string `json:"details,omitempty"`
	Reason  string `json:"reason,omitempty"`
	Enable  *bool  `json:"enable,omitempty"`
}

type AdminUserLifecycleResponse struct {
	UserID      string    `json:"userId"`
	Action      string    `json:"action"`
	Status      string    `json:"status"`
	PerformedAt time.Time `json:"performedAt"`
}

type VerifyEmailRequest struct {
	Email            string `json:"email"`
	VerificationCode string `json:"verification_code"`
}

type VerifyEmailResponse struct {
	UserID     string    `json:"user_id"`
	Status     string    `json:"status"`
	VerifiedAt time.Time `json:"verified_at"`
}

type KYCSubmitRequest struct {
	DocumentType   string `json:"document_type"`
	DocumentNumber string `json:"document_number"`
	IssueCountry   string `json:"issue_country"`
	ExpiryDate     string `json:"expiry_date"`
}

type KYCSubmitResponse struct {
	UserID       string `json:"user_id"`
	KYCStatus    string `json:"kyc_status"`
	SubmissionID string `json:"submission_id"`
}

type UpdateUserRequest struct {
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Country   string `json:"country"`
	State     string `json:"state"`
}

type UpdateUserResponse struct {
	UserID    string    `json:"user_id"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CommunicationPreferences struct {
	Announcements       bool `json:"announcements"`
	Promotions          bool `json:"promotions"`
	SubscriptionUpdates bool `json:"subscriptionUpdates"`
	SignInNotifications bool `json:"signInNotifications"`
}

type BettingPreferences struct {
	AutoAcceptBetterOdds bool `json:"autoAcceptBetterOdds"`
}

type UserPreferences struct {
	UserID                   string                   `json:"user_id"`
	CommunicationPreferences CommunicationPreferences `json:"communicationPreferences"`
	BettingPreferences       BettingPreferences       `json:"bettingPreferences"`
	UpdatedAt                time.Time                `json:"updated_at"`
}

type UpdatePreferencesRequest struct {
	CommunicationPreferences CommunicationPreferences `json:"communicationPreferences"`
	BettingPreferences       BettingPreferences       `json:"bettingPreferences"`
}

type KBAAnswer struct {
	QuestionID string `json:"questionId"`
	Answer     string `json:"answer,omitempty"`
	Choice     string `json:"choice,omitempty"`
}

type AnswerKBAQuestionsRequest struct {
	PunterID string      `json:"punterId,omitempty"`
	Answers  []KBAAnswer `json:"answers,omitempty"`
}

type KBAQuestion struct {
	QuestionID string   `json:"questionId"`
	Text       string   `json:"text"`
	Choices    []string `json:"choices"`
}

type AnswerKBAQuestionsResponse struct {
	PunterID  string        `json:"punterId,omitempty"`
	Questions []KBAQuestion `json:"questions,omitempty"`
	Type      string        `json:"type,omitempty"`
	Message   string        `json:"message,omitempty"`
}

type IDPVStatusRequest struct {
	PunterID string `json:"punterId,omitempty"`
}

type IDPVStatusResponse struct {
	Message       string     `json:"message,omitempty"`
	Status        string     `json:"status,omitempty"`
	SessionID     string     `json:"sessionId,omitempty"`
	Provider      string     `json:"provider,omitempty"`
	LastErrorCode string     `json:"lastErrorCode,omitempty"`
	LastUpdatedAt *time.Time `json:"lastUpdatedAt,omitempty"`
	CompletedAt   *time.Time `json:"completedAt,omitempty"`
}

type IDPVStartRequest struct {
	PunterID string `json:"punterId,omitempty"`
}

type IDPVStartResponse struct {
	IDPVRedirectURL string `json:"idpvRedirectUrl,omitempty"`
	SessionID       string `json:"sessionId,omitempty"`
}

type AssignRoleRequest struct {
	RoleName string `json:"role_name"`
}

type AssignRoleResponse struct {
	UserID     string    `json:"user_id"`
	Role       string    `json:"role"`
	AssignedAt time.Time `json:"assigned_at"`
}

type PermissionSet struct {
	UserID      string   `json:"user_id"`
	Permissions []string `json:"permissions"`
}

type RoleDetails struct {
	Name        string   `json:"name"`
	Permissions []string `json:"permissions"`
}

type RolesResponse struct {
	UserID string        `json:"user_id"`
	Roles  []RoleDetails `json:"roles"`
}

type UserSummary struct {
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
	Status    string    `json:"status"`
}

type AdminUserSummary struct {
	UserID      string     `json:"user_id"`
	Email       string     `json:"email"`
	Username    string     `json:"username"`
	FirstName   string     `json:"first_name"`
	LastName    string     `json:"last_name"`
	DateOfBirth *time.Time `json:"date_of_birth,omitempty"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	KYCStatus   string     `json:"kyc_status"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type UserFilters struct {
	Query       string
	Role        string
	Status      string
	UserID      string
	Username    string
	FirstName   string
	LastName    string
	DateOfBirth string
	Page        int
	Limit       int
}

type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

type ListUsersResponse struct {
	Data       []*AdminUserSummary `json:"data"`
	Pagination Pagination          `json:"pagination"`
}

type UserDetailResponse struct {
	UserID                           string                   `json:"user_id"`
	Email                            string                   `json:"email"`
	Username                         string                   `json:"username"`
	FirstName                        string                   `json:"first_name,omitempty"`
	LastName                         string                   `json:"last_name,omitempty"`
	Status                           string                   `json:"status"`
	KYCStatus                        string                   `json:"kyc_status"`
	Roles                            []string                 `json:"roles"`
	CreatedAt                        time.Time                `json:"created_at"`
	UpdatedAt                        time.Time                `json:"updated_at"`
	LastSignIn                       *time.Time               `json:"last_sign_in,omitempty"`
	SignUpDate                       time.Time                `json:"sign_up_date"`
	Terms                            *TermsAcceptanceInfo     `json:"terms,omitempty"`
	CommunicationPreferences         CommunicationPreferences `json:"communicationPreferences"`
	BettingPreferences               BettingPreferences       `json:"bettingPreferences"`
	HasToAcceptTerms                 bool                     `json:"has_to_accept_terms"`
	HasToAcceptResponsibilityCheck   bool                     `json:"has_to_accept_responsibility_check"`
	TwoFactorAuthEnabled             bool                     `json:"twoFactorAuthEnabled"`
	VerifiedAt                       *time.Time               `json:"verifiedAt,omitempty"`
	LastSignInV1                     *time.Time               `json:"lastSignIn,omitempty"`
	SignUpDateV1                     time.Time                `json:"signUpDate"`
	HasToAcceptTermsV1               bool                     `json:"hasToAcceptTerms"`
	HasToAcceptResponsibilityCheckV1 bool                     `json:"hasToAcceptResponsibilityCheck"`
}

type AuthClaims struct {
	UserID      string   `json:"user_id"`
	Email       string   `json:"email"`
	Username    string   `json:"username"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}

type VerificationRecord struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Code   string `json:"code"`
}

type VerificationChallengeRecord struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Code        string    `json:"code"`
	PhoneNumber string    `json:"phone_number,omitempty"`
	Purpose     string    `json:"purpose"`
	CreatedAt   time.Time `json:"created_at"`
}

type PasswordResetTokenRecord struct {
	Token     string    `json:"token"`
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type UserSession struct {
	ID                string     `json:"id"`
	UserID            string     `json:"user_id"`
	StartedAt         time.Time  `json:"started_at"`
	EndedAt           *time.Time `json:"ended_at,omitempty"`
	IPAddress         string     `json:"ip_address,omitempty"`
	UserAgent         string     `json:"user_agent,omitempty"`
	DeviceID          string     `json:"device_id,omitempty"`
	DeviceFingerprint string     `json:"deviceFingerprint,omitempty"`
}

type AdminUserSessionHistoryItem struct {
	SessionID string         `json:"sessionId"`
	StartTime time.Time      `json:"startTime"`
	EndTime   *time.Time     `json:"endTime,omitempty"`
	Details   map[string]any `json:"details,omitempty"`
}

type AdminUserSessionHistoryResponse struct {
	Data         []AdminUserSessionHistoryItem `json:"data"`
	CurrentPage  int                           `json:"currentPage"`
	ItemsPerPage int                           `json:"itemsPerPage"`
	TotalCount   int                           `json:"totalCount"`
}

type UserTermsAcceptance struct {
	UserID     string    `json:"user_id"`
	Version    string    `json:"version"`
	AcceptedAt time.Time `json:"accepted_at"`
}

type VerificationSession struct {
	ID                string        `json:"id"`
	UserID            string        `json:"userId"`
	FlowType          string        `json:"flowType"`
	Provider          string        `json:"provider"`
	Status            string        `json:"status"`
	Questions         []KBAQuestion `json:"questions,omitempty"`
	Answers           []KBAAnswer   `json:"answers,omitempty"`
	RedirectURL       string        `json:"redirectUrl,omitempty"`
	ProviderReference string        `json:"providerReference,omitempty"`
	ProviderDecision  string        `json:"providerDecision,omitempty"`
	ProviderCaseID    string        `json:"providerCaseId,omitempty"`
	LastErrorCode     string        `json:"lastErrorCode,omitempty"`
	AssignedTo        string        `json:"assignedTo,omitempty"`
	AssignedAt        *time.Time    `json:"assignedAt,omitempty"`
	CreatedAt         time.Time     `json:"createdAt"`
	UpdatedAt         time.Time     `json:"updatedAt"`
	CompletedAt       *time.Time    `json:"completedAt,omitempty"`
}

type VerificationSessionListResponse struct {
	Data []*VerificationSession `json:"data"`
}

type VerificationReviewQueueResponse struct {
	Data []*VerificationSession `json:"data"`
}

type VerificationProviderEvent struct {
	ID                    string         `json:"id"`
	VerificationSessionID string         `json:"verificationSessionId"`
	Provider              string         `json:"provider"`
	Status                string         `json:"status"`
	Source                string         `json:"source"`
	Reason                string         `json:"reason,omitempty"`
	Payload               map[string]any `json:"payload,omitempty"`
	CreatedAt             time.Time      `json:"createdAt"`
}

type VerificationProviderEventListResponse struct {
	Data []*VerificationProviderEvent `json:"data"`
}

type ProviderVerificationStatusUpdateRequest struct {
	Status        string         `json:"status"`
	LastErrorCode string         `json:"lastErrorCode,omitempty"`
	Reason        string         `json:"reason,omitempty"`
	ProviderRef   string         `json:"providerReference,omitempty"`
	RedirectURL   string         `json:"redirectUrl,omitempty"`
	Questions     []KBAQuestion  `json:"questions,omitempty"`
	Payload       map[string]any `json:"payload,omitempty"`
}

type ProviderVerificationStatusByReferenceRequest struct {
	ProviderReference string         `json:"providerReference"`
	Status            string         `json:"status"`
	LastErrorCode     string         `json:"lastErrorCode,omitempty"`
	Reason            string         `json:"reason,omitempty"`
	RedirectURL       string         `json:"redirectUrl,omitempty"`
	Questions         []KBAQuestion  `json:"questions,omitempty"`
	Payload           map[string]any `json:"payload,omitempty"`
}

type VerificationDecisionRequest struct {
	Decision  string         `json:"decision"`
	Reason    string         `json:"reason,omitempty"`
	Questions []KBAQuestion  `json:"questions,omitempty"`
	Payload   map[string]any `json:"payload,omitempty"`
}

type VerificationAssignmentRequest struct {
	AssignedTo string `json:"assignedTo"`
	Reason     string `json:"reason,omitempty"`
}

type VerificationNoteRequest struct {
	Note string `json:"note"`
}

type TermsDocument struct {
	CurrentTermsVersion string    `json:"current_terms_version"`
	TermsContent        string    `json:"terms_content"`
	TermsDaysThreshold  int       `json:"terms_days_threshold"`
	CreatedAt           time.Time `json:"created_at"`
}

type TokenBundle struct {
	Token            string `json:"token"`
	RefreshToken     string `json:"refreshToken"`
	ExpiresIn        int64  `json:"expiresIn"`
	RefreshExpiresIn int64  `json:"refreshExpiresIn"`
	TokenType        string `json:"tokenType"`
	UserID           string `json:"userId"`
}

func (u *User) PrimaryStatus() string {
	if !u.IsActive {
		return "suspended"
	}
	if u.IsVerified {
		return "verified"
	}
	return "pending_verification"
}

func (u *User) PublicKYCStatus() string {
	switch u.KYCStatus {
	case "verified":
		return "approved"
	case "pending":
		return "pending_review"
	default:
		return u.KYCStatus
	}
}
