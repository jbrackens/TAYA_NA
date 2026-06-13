package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/phoenixbot/phoenix-user/internal/models"
)

var ErrNotFound = errors.New("not found")

type UserRepository interface {
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByID(ctx context.Context, id string) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByUsername(ctx context.Context, username string) (*models.User, error)
	ListUsers(ctx context.Context, filters models.UserFilters) ([]*models.User, int, error)
	UpdateUser(ctx context.Context, user *models.User) error
	MarkEmailVerified(ctx context.Context, userID string, verifiedAt time.Time) error
	UpdateKYCStatus(ctx context.Context, userID, status string) error
	HasReferralCode(ctx context.Context, userID string) (bool, error)
	CreateReferralCode(ctx context.Context, userID, code string) error
	CreateSession(ctx context.Context, session *models.UserSession) error
	GetCurrentSession(ctx context.Context, userID string) (*models.UserSession, error)
	GetLatestSession(ctx context.Context, userID string) (*models.UserSession, error)
	ListUserSessions(ctx context.Context, userID string, page, limit int) ([]*models.UserSession, int, error)
	HasAcceptedResponsibilityCheck(ctx context.Context, userID string) (bool, error)
	EndCurrentSession(ctx context.Context, userID string, endedAt time.Time) error
	GetCurrentTerms(ctx context.Context) (*models.TermsDocument, error)
	GetLatestTermsAcceptance(ctx context.Context, userID string) (*models.UserTermsAcceptance, error)
	AcceptTerms(ctx context.Context, acceptance *models.UserTermsAcceptance) error
	CreateVerificationSession(ctx context.Context, session *models.VerificationSession) error
	GetVerificationSessionByID(ctx context.Context, sessionID string) (*models.VerificationSession, error)
	GetVerificationSessionByProviderReference(ctx context.Context, providerReference string) (*models.VerificationSession, error)
	GetVerificationSessionByProviderCaseID(ctx context.Context, providerCaseID string) (*models.VerificationSession, error)
	ListVerificationSessions(ctx context.Context, userID string) ([]*models.VerificationSession, error)
	ListVerificationReviewQueue(ctx context.Context, provider, assignedTo, flowType, status string) ([]*models.VerificationSession, error)
	GetLatestVerificationSession(ctx context.Context, userID, flowType string) (*models.VerificationSession, error)
	UpdateVerificationSession(ctx context.Context, session *models.VerificationSession) error
	AssignVerificationSession(ctx context.Context, sessionID, assignedTo, reason string) (*models.VerificationSession, error)
	CreateVerificationProviderEvent(ctx context.Context, event *models.VerificationProviderEvent) error
	ListVerificationProviderEvents(ctx context.Context, sessionID string) ([]*models.VerificationProviderEvent, error)
	AddVerificationSessionNote(ctx context.Context, sessionID, note, actorUserID string) ([]*models.VerificationProviderEvent, error)
	GetUserPreferences(ctx context.Context, userID string) (*models.UserPreferences, error)
	UpsertUserPreferences(ctx context.Context, preferences *models.UserPreferences) error
	UpdateMFAEnabled(ctx context.Context, userID string, enabled bool, updatedAt time.Time) error
	MarkPhoneVerified(ctx context.Context, userID string, verifiedAt time.Time) error
	UpdatePassword(ctx context.Context, userID, passwordHash string, updatedAt time.Time) error
	ActivateUser(ctx context.Context, userID string, updatedAt time.Time) error
	DeactivateUser(ctx context.Context, userID string, updatedAt time.Time) error
}

type postgresUserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) UserRepository {
	return &postgresUserRepository{pool: pool}
}

func (r *postgresUserRepository) CreateUser(ctx context.Context, user *models.User) error {
	const query = `
		INSERT INTO users (
			id, email, username, password_hash, role, kyc_status,
			first_name, last_name, date_of_birth, phone, country, state,
			mfa_enabled, is_active, is_verified, email_verified_at, phone_verified_at, created_at, updated_at
		)
		VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17, $18, $19
		)
	`
	_, err := r.pool.Exec(ctx, query,
		user.ID, user.Email, user.Username, user.PasswordHash, user.Role, user.KYCStatus,
		user.FirstName, user.LastName, user.DateOfBirth, user.Phone, user.Country, user.State,
		user.MFAEnabled, user.IsActive, user.IsVerified, user.EmailVerifiedAt, user.PhoneVerifiedAt, user.CreatedAt, user.UpdatedAt,
	)
	return err
}

func (r *postgresUserRepository) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	return r.getUser(ctx, `SELECT id, email, username, password_hash, role, kyc_status, first_name, last_name, date_of_birth, phone, country, state, mfa_enabled, is_active, is_verified, email_verified_at, phone_verified_at, created_at, updated_at FROM users WHERE id = $1`, id)
}

func (r *postgresUserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return r.getUser(ctx, `SELECT id, email, username, password_hash, role, kyc_status, first_name, last_name, date_of_birth, phone, country, state, mfa_enabled, is_active, is_verified, email_verified_at, phone_verified_at, created_at, updated_at FROM users WHERE lower(email) = lower($1)`, email)
}

func (r *postgresUserRepository) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	return r.getUser(ctx, `SELECT id, email, username, password_hash, role, kyc_status, first_name, last_name, date_of_birth, phone, country, state, mfa_enabled, is_active, is_verified, email_verified_at, phone_verified_at, created_at, updated_at FROM users WHERE lower(username) = lower($1)`, username)
}

func (r *postgresUserRepository) ListUsers(ctx context.Context, filters models.UserFilters) ([]*models.User, int, error) {
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 100 {
		limit = 25
	}
	offset := (page - 1) * limit

	conditions := []string{"1=1"}
	args := make([]any, 0, 10)
	argPos := 1

	// Exact user ID filter (Talon punterId)
	if uid := strings.TrimSpace(filters.UserID); uid != "" {
		conditions = append(conditions, fmt.Sprintf("id = $%d", argPos))
		args = append(args, uid)
		argPos++
	}
	// Individual field filters (Talon column search)
	if v := strings.TrimSpace(filters.Username); v != "" {
		conditions = append(conditions, fmt.Sprintf("lower(username) LIKE lower($%d)", argPos))
		args = append(args, "%"+v+"%")
		argPos++
	}
	if v := strings.TrimSpace(filters.FirstName); v != "" {
		conditions = append(conditions, fmt.Sprintf("lower(first_name) LIKE lower($%d)", argPos))
		args = append(args, "%"+v+"%")
		argPos++
	}
	if v := strings.TrimSpace(filters.LastName); v != "" {
		conditions = append(conditions, fmt.Sprintf("lower(last_name) LIKE lower($%d)", argPos))
		args = append(args, "%"+v+"%")
		argPos++
	}
	if v := strings.TrimSpace(filters.DateOfBirth); v != "" {
		conditions = append(conditions, fmt.Sprintf("date_of_birth = $%d::date", argPos))
		args = append(args, v)
		argPos++
	}
	// Generic search across email, username, first_name, last_name
	if query := strings.TrimSpace(filters.Query); query != "" {
		conditions = append(conditions, fmt.Sprintf("(lower(email) LIKE lower($%d) OR lower(username) LIKE lower($%d) OR lower(first_name) LIKE lower($%d) OR lower(last_name) LIKE lower($%d))", argPos, argPos, argPos, argPos))
		args = append(args, "%"+query+"%")
		argPos++
	}
	if role := strings.TrimSpace(filters.Role); role != "" {
		conditions = append(conditions, fmt.Sprintf("role = $%d", argPos))
		args = append(args, role)
		argPos++
	}
	switch strings.TrimSpace(filters.Status) {
	case "verified":
		conditions = append(conditions, "is_active = TRUE AND is_verified = TRUE")
	case "pending_verification":
		conditions = append(conditions, "is_active = TRUE AND is_verified = FALSE")
	case "suspended":
		conditions = append(conditions, "is_active = FALSE")
	}
	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM users WHERE %s`, whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT id, email, username, password_hash, role, kyc_status, first_name, last_name, date_of_birth, phone, country, state, mfa_enabled, is_active, is_verified, email_verified_at, phone_verified_at, created_at, updated_at
		FROM users
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argPos, argPos+1)
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	users := make([]*models.User, 0, limit)
	for rows.Next() {
		user := &models.User{}
		if err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.Username,
			&user.PasswordHash,
			&user.Role,
			&user.KYCStatus,
			&user.FirstName,
			&user.LastName,
			&user.DateOfBirth,
			&user.Phone,
			&user.Country,
			&user.State,
			&user.MFAEnabled,
			&user.IsActive,
			&user.IsVerified,
			&user.EmailVerifiedAt,
			&user.PhoneVerifiedAt,
			&user.CreatedAt,
			&user.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

func (r *postgresUserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	const query = `
		UPDATE users
		SET email = $1,
			first_name = $2,
			last_name = $3,
			phone = $4,
			country = $5,
			state = $6,
			role = $7,
			mfa_enabled = $8,
			updated_at = $9
		WHERE id = $10
	`
	commandTag, err := r.pool.Exec(ctx, query, user.Email, user.FirstName, user.LastName, user.Phone, user.Country, user.State, user.Role, user.MFAEnabled, user.UpdatedAt, user.ID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresUserRepository) MarkEmailVerified(ctx context.Context, userID string, verifiedAt time.Time) error {
	const query = `
		UPDATE users
		SET is_verified = TRUE,
			email_verified_at = $1,
			updated_at = $2
		WHERE id = $3
	`
	commandTag, err := r.pool.Exec(ctx, query, verifiedAt, verifiedAt, userID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresUserRepository) UpdateKYCStatus(ctx context.Context, userID, status string) error {
	const query = `UPDATE users SET kyc_status = $1, updated_at = $2 WHERE id = $3`
	commandTag, err := r.pool.Exec(ctx, query, status, time.Now().UTC(), userID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresUserRepository) HasReferralCode(ctx context.Context, userID string) (bool, error) {
	const query = `SELECT EXISTS(SELECT 1 FROM referral_codes WHERE user_id = $1 AND is_active = TRUE)`
	var exists bool
	if err := r.pool.QueryRow(ctx, query, userID).Scan(&exists); err != nil {
		return false, err
	}
	return exists, nil
}

func (r *postgresUserRepository) CreateReferralCode(ctx context.Context, userID, code string) error {
	const query = `INSERT INTO referral_codes (user_id, code) VALUES ($1, $2)`
	_, err := r.pool.Exec(ctx, query, userID, strings.ToUpper(code))
	return err
}

func (r *postgresUserRepository) CreateSession(ctx context.Context, session *models.UserSession) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
		UPDATE user_sessions
		SET ended_at = $1
		WHERE user_id = $2 AND ended_at IS NULL
	`, session.StartedAt, session.UserID); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO user_sessions (id, user_id, started_at, ip_address, user_agent, device_id, device_fingerprint)
		VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''))
	`, session.ID, session.UserID, session.StartedAt, session.IPAddress, session.UserAgent, session.DeviceID, session.DeviceFingerprint); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *postgresUserRepository) GetCurrentSession(ctx context.Context, userID string) (*models.UserSession, error) {
	return r.getSession(ctx, `
		SELECT id, user_id, started_at, ended_at, COALESCE(ip_address, ''), COALESCE(user_agent, ''), COALESCE(device_id, ''), COALESCE(device_fingerprint, '')
		FROM user_sessions
		WHERE user_id = $1 AND ended_at IS NULL
		ORDER BY started_at DESC
		LIMIT 1
	`, userID)
}

func (r *postgresUserRepository) GetLatestSession(ctx context.Context, userID string) (*models.UserSession, error) {
	return r.getSession(ctx, `
		SELECT id, user_id, started_at, ended_at, COALESCE(ip_address, ''), COALESCE(user_agent, ''), COALESCE(device_id, ''), COALESCE(device_fingerprint, '')
		FROM user_sessions
		WHERE user_id = $1
		ORDER BY started_at DESC
		LIMIT 1
	`, userID)
}

func (r *postgresUserRepository) ListUserSessions(ctx context.Context, userID string, page, limit int) ([]*models.UserSession, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM user_sessions WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, started_at, ended_at, COALESCE(ip_address, ''), COALESCE(user_agent, ''), COALESCE(device_id, ''), COALESCE(device_fingerprint, '')
		FROM user_sessions
		WHERE user_id = $1
		ORDER BY started_at DESC
		OFFSET $2 LIMIT $3
	`, userID, offset, limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	sessions := make([]*models.UserSession, 0, limit)
	for rows.Next() {
		session := &models.UserSession{}
		if err := rows.Scan(
			&session.ID,
			&session.UserID,
			&session.StartedAt,
			&session.EndedAt,
			&session.IPAddress,
			&session.UserAgent,
			&session.DeviceID,
			&session.DeviceFingerprint,
		); err != nil {
			return nil, 0, err
		}
		sessions = append(sessions, session)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return sessions, total, nil
}

func (r *postgresUserRepository) HasAcceptedResponsibilityCheck(ctx context.Context, userID string) (bool, error) {
	var accepted bool
	if err := r.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM responsibility_checks WHERE user_id = $1)`, userID).Scan(&accepted); err != nil {
		return false, err
	}
	return accepted, nil
}

func (r *postgresUserRepository) EndCurrentSession(ctx context.Context, userID string, endedAt time.Time) error {
	commandTag, err := r.pool.Exec(ctx, `
		UPDATE user_sessions
		SET ended_at = $1
		WHERE user_id = $2 AND ended_at IS NULL
	`, endedAt, userID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresUserRepository) GetCurrentTerms(ctx context.Context) (*models.TermsDocument, error) {
	doc := &models.TermsDocument{}
	err := r.pool.QueryRow(ctx, `
		SELECT current_terms_version, terms_content, terms_days_threshold, created_at
		FROM terms_documents
		ORDER BY created_at DESC
		LIMIT 1
	`).Scan(&doc.CurrentTermsVersion, &doc.TermsContent, &doc.TermsDaysThreshold, &doc.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query current terms: %w", err)
	}
	return doc, nil
}

func (r *postgresUserRepository) GetLatestTermsAcceptance(ctx context.Context, userID string) (*models.UserTermsAcceptance, error) {
	acceptance := &models.UserTermsAcceptance{}
	err := r.pool.QueryRow(ctx, `
		SELECT user_id, terms_version, accepted_at
		FROM user_terms_acceptance
		WHERE user_id = $1
		ORDER BY accepted_at DESC
		LIMIT 1
	`, userID).Scan(&acceptance.UserID, &acceptance.Version, &acceptance.AcceptedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query latest terms acceptance: %w", err)
	}
	return acceptance, nil
}

func (r *postgresUserRepository) AcceptTerms(ctx context.Context, acceptance *models.UserTermsAcceptance) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO user_terms_acceptance (id, user_id, terms_version, accepted_at)
		VALUES (gen_random_uuid(), $1, $2, $3)
		ON CONFLICT (user_id, terms_version) DO NOTHING
	`, acceptance.UserID, acceptance.Version, acceptance.AcceptedAt)
	return err
}

func (r *postgresUserRepository) CreateVerificationSession(ctx context.Context, session *models.VerificationSession) error {
	questionsJSON, err := marshalVerificationPayload(session.Questions)
	if err != nil {
		return err
	}
	answersJSON, err := marshalVerificationPayload(session.Answers)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `
		INSERT INTO user_verification_sessions (
			id, user_id, flow_type, provider, status, questions, answers, redirect_url, provider_reference, provider_decision, provider_case_id, last_error_code, assigned_operator_id, assigned_at, created_at, updated_at, completed_at
		)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, ''), NULLIF($11, ''), NULLIF($12, ''), NULLIF($13, '')::uuid, $14, $15, $16, $17)
	`, session.ID, session.UserID, session.FlowType, session.Provider, session.Status, questionsJSON, answersJSON, session.RedirectURL, session.ProviderReference, session.ProviderDecision, session.ProviderCaseID, session.LastErrorCode, session.AssignedTo, session.AssignedAt, session.CreatedAt, session.UpdatedAt, session.CompletedAt)
	return err
}

func (r *postgresUserRepository) GetVerificationSessionByID(ctx context.Context, sessionID string) (*models.VerificationSession, error) {
	return r.getVerificationSession(ctx, `
		SELECT id, user_id, flow_type, provider, status, COALESCE(questions, '[]'::jsonb)::text, COALESCE(answers, '[]'::jsonb)::text, COALESCE(redirect_url, ''), COALESCE(provider_reference, ''), COALESCE(provider_decision, ''), COALESCE(provider_case_id, ''), COALESCE(last_error_code, ''), COALESCE(assigned_operator_id::text, ''), assigned_at, created_at, updated_at, completed_at
		FROM user_verification_sessions
		WHERE id = $1
	`, sessionID)
}

func (r *postgresUserRepository) GetVerificationSessionByProviderReference(ctx context.Context, providerReference string) (*models.VerificationSession, error) {
	return r.getVerificationSession(ctx, `
		SELECT id, user_id, flow_type, provider, status, COALESCE(questions, '[]'::jsonb)::text, COALESCE(answers, '[]'::jsonb)::text, COALESCE(redirect_url, ''), COALESCE(provider_reference, ''), COALESCE(provider_decision, ''), COALESCE(provider_case_id, ''), COALESCE(last_error_code, ''), COALESCE(assigned_operator_id::text, ''), assigned_at, created_at, updated_at, completed_at
		FROM user_verification_sessions
		WHERE provider_reference = $1
		ORDER BY updated_at DESC, created_at DESC
		LIMIT 1
	`, providerReference)
}

func (r *postgresUserRepository) GetVerificationSessionByProviderCaseID(ctx context.Context, providerCaseID string) (*models.VerificationSession, error) {
	return r.getVerificationSession(ctx, `
		SELECT id, user_id, flow_type, provider, status, COALESCE(questions, '[]'::jsonb)::text, COALESCE(answers, '[]'::jsonb)::text, COALESCE(redirect_url, ''), COALESCE(provider_reference, ''), COALESCE(provider_decision, ''), COALESCE(provider_case_id, ''), COALESCE(last_error_code, ''), COALESCE(assigned_operator_id::text, ''), assigned_at, created_at, updated_at, completed_at
		FROM user_verification_sessions
		WHERE provider_case_id = $1
		ORDER BY updated_at DESC, created_at DESC
		LIMIT 1
	`, providerCaseID)
}

func (r *postgresUserRepository) getVerificationSession(ctx context.Context, query, arg string) (*models.VerificationSession, error) {
	session := &models.VerificationSession{}
	var questionsJSON string
	var answersJSON string
	err := r.pool.QueryRow(ctx, query, arg).Scan(
		&session.ID,
		&session.UserID,
		&session.FlowType,
		&session.Provider,
		&session.Status,
		&questionsJSON,
		&answersJSON,
		&session.RedirectURL,
		&session.ProviderReference,
		&session.ProviderDecision,
		&session.ProviderCaseID,
		&session.LastErrorCode,
		&session.AssignedTo,
		&session.AssignedAt,
		&session.CreatedAt,
		&session.UpdatedAt,
		&session.CompletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query verification session by id: %w", err)
	}
	if err := unmarshalVerificationPayload([]byte(questionsJSON), &session.Questions); err != nil {
		return nil, err
	}
	if err := unmarshalVerificationPayload([]byte(answersJSON), &session.Answers); err != nil {
		return nil, err
	}
	return session, nil
}

func (r *postgresUserRepository) ListVerificationSessions(ctx context.Context, userID string) ([]*models.VerificationSession, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, flow_type, provider, status, COALESCE(questions, '[]'::jsonb)::text, COALESCE(answers, '[]'::jsonb)::text, COALESCE(redirect_url, ''), COALESCE(provider_reference, ''), COALESCE(provider_decision, ''), COALESCE(provider_case_id, ''), COALESCE(last_error_code, ''), COALESCE(assigned_operator_id::text, ''), assigned_at, created_at, updated_at, completed_at
		FROM user_verification_sessions
		WHERE user_id = $1
		ORDER BY updated_at DESC, created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("query verification sessions: %w", err)
	}
	defer rows.Close()

	sessions := make([]*models.VerificationSession, 0)
	for rows.Next() {
		session := &models.VerificationSession{}
		var questionsJSON string
		var answersJSON string
		if err := rows.Scan(
			&session.ID,
			&session.UserID,
			&session.FlowType,
			&session.Provider,
			&session.Status,
			&questionsJSON,
			&answersJSON,
			&session.RedirectURL,
			&session.ProviderReference,
			&session.ProviderDecision,
			&session.ProviderCaseID,
			&session.LastErrorCode,
			&session.AssignedTo,
			&session.AssignedAt,
			&session.CreatedAt,
			&session.UpdatedAt,
			&session.CompletedAt,
		); err != nil {
			return nil, err
		}
		if err := unmarshalVerificationPayload([]byte(questionsJSON), &session.Questions); err != nil {
			return nil, err
		}
		if err := unmarshalVerificationPayload([]byte(answersJSON), &session.Answers); err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return sessions, nil
}

func (r *postgresUserRepository) ListVerificationReviewQueue(ctx context.Context, provider, assignedTo, flowType, status string) ([]*models.VerificationSession, error) {
	provider = strings.TrimSpace(provider)
	if provider == "" {
		provider = "idcomply"
	}
	conditions := []string{"provider = $1"}
	args := []any{provider}
	if trimmedStatus := strings.TrimSpace(status); trimmedStatus != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)+1))
		args = append(args, trimmedStatus)
	} else {
		conditions = append(conditions, fmt.Sprintf("status = ANY($%d::text[])", len(args)+1))
		args = append(args, []string{"pending_review", "provider_reviewing", "questions_presented"})
	}
	if trimmedFlowType := strings.TrimSpace(flowType); trimmedFlowType != "" {
		conditions = append(conditions, fmt.Sprintf("flow_type = $%d", len(args)+1))
		args = append(args, trimmedFlowType)
	}
	if trimmed := strings.TrimSpace(assignedTo); trimmed != "" {
		if strings.EqualFold(trimmed, "unassigned") {
			conditions = append(conditions, "assigned_operator_id IS NULL")
		} else {
			conditions = append(conditions, fmt.Sprintf("assigned_operator_id = $%d::uuid", len(args)+1))
			args = append(args, trimmed)
		}
	}
	rows, err := r.pool.Query(ctx, fmt.Sprintf(`
		SELECT id, user_id, flow_type, provider, status, COALESCE(questions, '[]'::jsonb)::text, COALESCE(answers, '[]'::jsonb)::text, COALESCE(redirect_url, ''), COALESCE(provider_reference, ''), COALESCE(provider_decision, ''), COALESCE(provider_case_id, ''), COALESCE(last_error_code, ''), COALESCE(assigned_operator_id::text, ''), assigned_at, created_at, updated_at, completed_at
		FROM user_verification_sessions
		WHERE %s
		ORDER BY updated_at DESC, created_at DESC
	`, strings.Join(conditions, " AND ")), args...)
	if err != nil {
		return nil, fmt.Errorf("query verification review queue: %w", err)
	}
	defer rows.Close()

	sessions := make([]*models.VerificationSession, 0)
	for rows.Next() {
		session := &models.VerificationSession{}
		var questionsJSON string
		var answersJSON string
		if err := rows.Scan(
			&session.ID,
			&session.UserID,
			&session.FlowType,
			&session.Provider,
			&session.Status,
			&questionsJSON,
			&answersJSON,
			&session.RedirectURL,
			&session.ProviderReference,
			&session.ProviderDecision,
			&session.ProviderCaseID,
			&session.LastErrorCode,
			&session.AssignedTo,
			&session.AssignedAt,
			&session.CreatedAt,
			&session.UpdatedAt,
			&session.CompletedAt,
		); err != nil {
			return nil, err
		}
		if err := unmarshalVerificationPayload([]byte(questionsJSON), &session.Questions); err != nil {
			return nil, err
		}
		if err := unmarshalVerificationPayload([]byte(answersJSON), &session.Answers); err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return sessions, nil
}

func (r *postgresUserRepository) GetLatestVerificationSession(ctx context.Context, userID, flowType string) (*models.VerificationSession, error) {
	session := &models.VerificationSession{}
	var questionsJSON string
	var answersJSON string
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, flow_type, provider, status, COALESCE(questions, '[]'::jsonb)::text, COALESCE(answers, '[]'::jsonb)::text, COALESCE(redirect_url, ''), COALESCE(provider_reference, ''), COALESCE(provider_decision, ''), COALESCE(provider_case_id, ''), COALESCE(last_error_code, ''), COALESCE(assigned_operator_id::text, ''), assigned_at, created_at, updated_at, completed_at
		FROM user_verification_sessions
		WHERE user_id = $1 AND flow_type = $2
		ORDER BY updated_at DESC, created_at DESC
		LIMIT 1
	`, userID, flowType).Scan(
		&session.ID,
		&session.UserID,
		&session.FlowType,
		&session.Provider,
		&session.Status,
		&questionsJSON,
		&answersJSON,
		&session.RedirectURL,
		&session.ProviderReference,
		&session.ProviderDecision,
		&session.ProviderCaseID,
		&session.LastErrorCode,
		&session.AssignedTo,
		&session.AssignedAt,
		&session.CreatedAt,
		&session.UpdatedAt,
		&session.CompletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query verification session: %w", err)
	}
	if err := unmarshalVerificationPayload([]byte(questionsJSON), &session.Questions); err != nil {
		return nil, err
	}
	if err := unmarshalVerificationPayload([]byte(answersJSON), &session.Answers); err != nil {
		return nil, err
	}
	return session, nil
}

func (r *postgresUserRepository) UpdateVerificationSession(ctx context.Context, session *models.VerificationSession) error {
	questionsJSON, err := marshalVerificationPayload(session.Questions)
	if err != nil {
		return err
	}
	answersJSON, err := marshalVerificationPayload(session.Answers)
	if err != nil {
		return err
	}
	commandTag, err := r.pool.Exec(ctx, `
		UPDATE user_verification_sessions
		SET provider = $1,
			status = $2,
			questions = $3::jsonb,
			answers = $4::jsonb,
			redirect_url = NULLIF($5, ''),
			provider_reference = NULLIF($6, ''),
			provider_decision = NULLIF($7, ''),
			provider_case_id = NULLIF($8, ''),
			last_error_code = NULLIF($9, ''),
			assigned_operator_id = NULLIF($10, '')::uuid,
			assigned_at = $11,
			updated_at = $12,
			completed_at = $13
		WHERE id = $14
	`, session.Provider, session.Status, questionsJSON, answersJSON, session.RedirectURL, session.ProviderReference, session.ProviderDecision, session.ProviderCaseID, session.LastErrorCode, session.AssignedTo, session.AssignedAt, session.UpdatedAt, session.CompletedAt, session.ID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresUserRepository) AssignVerificationSession(ctx context.Context, sessionID, assignedTo, reason string) (*models.VerificationSession, error) {
	now := time.Now().UTC()
	commandTag, err := r.pool.Exec(ctx, `
		UPDATE user_verification_sessions
		SET assigned_operator_id = NULLIF($1, '')::uuid,
			assigned_at = $2,
			updated_at = $2
		WHERE id = $3
	`, strings.TrimSpace(assignedTo), now, sessionID)
	if err != nil {
		return nil, err
	}
	if commandTag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	if err := r.CreateVerificationProviderEvent(ctx, &models.VerificationProviderEvent{
		ID:                    uuid.NewString(),
		VerificationSessionID: sessionID,
		Provider:              "idcomply",
		Status:                "assigned",
		Source:                "admin_assign",
		Reason:                strings.TrimSpace(reason),
		Payload:               map[string]any{"assignedTo": strings.TrimSpace(assignedTo)},
		CreatedAt:             now,
	}); err != nil {
		return nil, err
	}
	return r.GetVerificationSessionByID(ctx, sessionID)
}

func (r *postgresUserRepository) AddVerificationSessionNote(ctx context.Context, sessionID, note, actorUserID string) ([]*models.VerificationProviderEvent, error) {
	session, err := r.GetVerificationSessionByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if err := r.CreateVerificationProviderEvent(ctx, &models.VerificationProviderEvent{
		ID:                    uuid.NewString(),
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
	return r.ListVerificationProviderEvents(ctx, sessionID)
}

func (r *postgresUserRepository) CreateVerificationProviderEvent(ctx context.Context, event *models.VerificationProviderEvent) error {
	payloadJSON, err := marshalJSONPayload(event.Payload)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `
		INSERT INTO verification_provider_events (
			id, verification_session_id, provider, status, source, reason, payload, created_at
		)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7::jsonb, $8)
	`, event.ID, event.VerificationSessionID, event.Provider, event.Status, event.Source, event.Reason, payloadJSON, event.CreatedAt)
	return err
}

func (r *postgresUserRepository) ListVerificationProviderEvents(ctx context.Context, sessionID string) ([]*models.VerificationProviderEvent, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, verification_session_id, provider, status, source, COALESCE(reason, ''), COALESCE(payload, '{}'::jsonb)::text, created_at
		FROM verification_provider_events
		WHERE verification_session_id = $1
		ORDER BY created_at DESC
	`, sessionID)
	if err != nil {
		return nil, fmt.Errorf("query verification provider events: %w", err)
	}
	defer rows.Close()

	events := make([]*models.VerificationProviderEvent, 0)
	for rows.Next() {
		event := &models.VerificationProviderEvent{}
		var payloadJSON string
		if err := rows.Scan(
			&event.ID,
			&event.VerificationSessionID,
			&event.Provider,
			&event.Status,
			&event.Source,
			&event.Reason,
			&payloadJSON,
			&event.CreatedAt,
		); err != nil {
			return nil, err
		}
		if err := unmarshalJSONPayload([]byte(payloadJSON), &event.Payload); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return events, nil
}

func (r *postgresUserRepository) GetUserPreferences(ctx context.Context, userID string) (*models.UserPreferences, error) {
	preferences := &models.UserPreferences{}
	err := r.pool.QueryRow(ctx, `
		SELECT user_id, announcements, promotions, subscription_updates, sign_in_notifications, auto_accept_better_odds, updated_at
		FROM user_preferences
		WHERE user_id = $1
	`, userID).Scan(
		&preferences.UserID,
		&preferences.CommunicationPreferences.Announcements,
		&preferences.CommunicationPreferences.Promotions,
		&preferences.CommunicationPreferences.SubscriptionUpdates,
		&preferences.CommunicationPreferences.SignInNotifications,
		&preferences.BettingPreferences.AutoAcceptBetterOdds,
		&preferences.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query user preferences: %w", err)
	}
	return preferences, nil
}

func (r *postgresUserRepository) UpsertUserPreferences(ctx context.Context, preferences *models.UserPreferences) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO user_preferences (
			user_id, announcements, promotions, subscription_updates, sign_in_notifications, auto_accept_better_odds, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id) DO UPDATE SET
			announcements = EXCLUDED.announcements,
			promotions = EXCLUDED.promotions,
			subscription_updates = EXCLUDED.subscription_updates,
			sign_in_notifications = EXCLUDED.sign_in_notifications,
			auto_accept_better_odds = EXCLUDED.auto_accept_better_odds,
			updated_at = EXCLUDED.updated_at
	`, preferences.UserID,
		preferences.CommunicationPreferences.Announcements,
		preferences.CommunicationPreferences.Promotions,
		preferences.CommunicationPreferences.SubscriptionUpdates,
		preferences.CommunicationPreferences.SignInNotifications,
		preferences.BettingPreferences.AutoAcceptBetterOdds,
		preferences.UpdatedAt,
	)
	return err
}

func (r *postgresUserRepository) UpdateMFAEnabled(ctx context.Context, userID string, enabled bool, updatedAt time.Time) error {
	commandTag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET mfa_enabled = $1, updated_at = $2
		WHERE id = $3
	`, enabled, updatedAt, userID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresUserRepository) MarkPhoneVerified(ctx context.Context, userID string, verifiedAt time.Time) error {
	commandTag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET phone_verified_at = $1, updated_at = $2
		WHERE id = $3
	`, verifiedAt, verifiedAt, userID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresUserRepository) UpdatePassword(ctx context.Context, userID, passwordHash string, updatedAt time.Time) error {
	commandTag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET password_hash = $1, updated_at = $2
		WHERE id = $3
	`, passwordHash, updatedAt, userID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresUserRepository) DeactivateUser(ctx context.Context, userID string, updatedAt time.Time) error {
	commandTag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET is_active = FALSE, updated_at = $1
		WHERE id = $2
	`, updatedAt, userID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresUserRepository) ActivateUser(ctx context.Context, userID string, updatedAt time.Time) error {
	commandTag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET is_active = TRUE, updated_at = $1
		WHERE id = $2
	`, updatedAt, userID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresUserRepository) getUser(ctx context.Context, query string, arg any) (*models.User, error) {
	user := &models.User{}
	err := r.pool.QueryRow(ctx, query, arg).Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.PasswordHash,
		&user.Role,
		&user.KYCStatus,
		&user.FirstName,
		&user.LastName,
		&user.DateOfBirth,
		&user.Phone,
		&user.Country,
		&user.State,
		&user.MFAEnabled,
		&user.IsActive,
		&user.IsVerified,
		&user.EmailVerifiedAt,
		&user.PhoneVerifiedAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query user: %w", err)
	}
	return user, nil
}

func (r *postgresUserRepository) getSession(ctx context.Context, query string, userID string) (*models.UserSession, error) {
	session := &models.UserSession{}
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&session.ID,
		&session.UserID,
		&session.StartedAt,
		&session.EndedAt,
		&session.IPAddress,
		&session.UserAgent,
		&session.DeviceID,
		&session.DeviceFingerprint,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query session: %w", err)
	}
	return session, nil
}

func marshalVerificationPayload(value any) ([]byte, error) {
	if value == nil {
		return []byte("[]"), nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("marshal verification payload: %w", err)
	}
	return raw, nil
}

func marshalJSONPayload(value any) ([]byte, error) {
	if value == nil {
		return []byte("{}"), nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("marshal payload: %w", err)
	}
	return raw, nil
}

func unmarshalVerificationPayload(raw []byte, target any) error {
	if len(raw) == 0 {
		raw = []byte("[]")
	}
	if err := json.Unmarshal(raw, target); err != nil {
		return fmt.Errorf("unmarshal verification payload: %w", err)
	}
	return nil
}

func unmarshalJSONPayload(raw []byte, target any) error {
	if len(raw) == 0 {
		raw = []byte("{}")
	}
	if err := json.Unmarshal(raw, target); err != nil {
		return fmt.Errorf("unmarshal payload: %w", err)
	}
	return nil
}
