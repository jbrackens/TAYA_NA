package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/phoenixbot/phoenix-user/internal/models"
)

var ErrTokenNotFound = errors.New("token not found")

type TokenStore interface {
	StoreVerificationCode(ctx context.Context, record models.VerificationRecord, ttl time.Duration) error
	ConsumeVerificationCode(ctx context.Context, email, code string) (*models.VerificationRecord, error)
	GetVerificationCodeByCode(ctx context.Context, code string) (*models.VerificationRecord, error)
	StoreVerificationChallenge(ctx context.Context, record models.VerificationChallengeRecord, ttl time.Duration) error
	ApproveVerificationChallenge(ctx context.Context, id, code string) (*models.VerificationChallengeRecord, error)
	StorePasswordResetToken(ctx context.Context, token string, record models.PasswordResetTokenRecord, ttl time.Duration) error
	GetPasswordResetToken(ctx context.Context, token string) (*models.PasswordResetTokenRecord, error)
	ConsumePasswordResetToken(ctx context.Context, token string) (*models.PasswordResetTokenRecord, error)
	StoreRefreshToken(ctx context.Context, token, userID string, ttl time.Duration) error
	GetRefreshTokenUserID(ctx context.Context, token string) (string, error)
	DeleteRefreshToken(ctx context.Context, token string) error
}

type redisTokenStore struct {
	client *redis.Client
}

func NewRedisTokenStore(client *redis.Client) TokenStore {
	return &redisTokenStore{client: client}
}

func (s *redisTokenStore) StoreVerificationCode(ctx context.Context, record models.VerificationRecord, ttl time.Duration) error {
	key := verificationKey(record.Email, record.Code)
	codeKey := verificationCodeAliasKey(record.Code)
	pipe := s.client.TxPipeline()
	pipe.HSet(ctx, key, map[string]any{
		"user_id": record.UserID,
		"email":   record.Email,
		"code":    record.Code,
	})
	pipe.Expire(ctx, key, ttl)
	pipe.HSet(ctx, codeKey, map[string]any{
		"user_id": record.UserID,
		"email":   record.Email,
		"code":    record.Code,
	})
	pipe.Expire(ctx, codeKey, ttl)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *redisTokenStore) ConsumeVerificationCode(ctx context.Context, email, code string) (*models.VerificationRecord, error) {
	key := verificationKey(email, code)
	values, err := s.client.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	if len(values) == 0 {
		return nil, ErrTokenNotFound
	}
	if err := s.client.Del(ctx, key).Err(); err != nil {
		return nil, err
	}
	_ = s.client.Del(ctx, verificationCodeAliasKey(code)).Err()
	return &models.VerificationRecord{UserID: values["user_id"], Email: values["email"], Code: values["code"]}, nil
}

func (s *redisTokenStore) GetVerificationCodeByCode(ctx context.Context, code string) (*models.VerificationRecord, error) {
	values, err := s.client.HGetAll(ctx, verificationCodeAliasKey(code)).Result()
	if err != nil {
		return nil, err
	}
	if len(values) == 0 {
		return nil, ErrTokenNotFound
	}
	return &models.VerificationRecord{UserID: values["user_id"], Email: values["email"], Code: values["code"]}, nil
}

func (s *redisTokenStore) StoreVerificationChallenge(ctx context.Context, record models.VerificationChallengeRecord, ttl time.Duration) error {
	key := verificationChallengeKey(record.ID)
	pipe := s.client.TxPipeline()
	pipe.HSet(ctx, key, map[string]any{
		"id":           record.ID,
		"user_id":      record.UserID,
		"code":         record.Code,
		"phone_number": record.PhoneNumber,
		"purpose":      record.Purpose,
		"created_at":   record.CreatedAt.Format(time.RFC3339Nano),
	})
	pipe.Expire(ctx, key, ttl)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *redisTokenStore) ApproveVerificationChallenge(ctx context.Context, id, code string) (*models.VerificationChallengeRecord, error) {
	key := verificationChallengeKey(id)
	values, err := s.client.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	if len(values) == 0 {
		return nil, ErrTokenNotFound
	}
	if values["code"] != code {
		return nil, ErrTokenNotFound
	}
	if err := s.client.Del(ctx, key).Err(); err != nil {
		return nil, err
	}
	createdAt, err := time.Parse(time.RFC3339Nano, values["created_at"])
	if err != nil {
		createdAt = time.Now().UTC()
	}
	return &models.VerificationChallengeRecord{
		ID:          values["id"],
		UserID:      values["user_id"],
		Code:        values["code"],
		PhoneNumber: values["phone_number"],
		Purpose:     values["purpose"],
		CreatedAt:   createdAt,
	}, nil
}

func (s *redisTokenStore) StorePasswordResetToken(ctx context.Context, token string, record models.PasswordResetTokenRecord, ttl time.Duration) error {
	key := passwordResetKey(token)
	pipe := s.client.TxPipeline()
	pipe.HSet(ctx, key, map[string]any{
		"token":      record.Token,
		"user_id":    record.UserID,
		"email":      record.Email,
		"created_at": record.CreatedAt.Format(time.RFC3339Nano),
	})
	pipe.Expire(ctx, key, ttl)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *redisTokenStore) GetPasswordResetToken(ctx context.Context, token string) (*models.PasswordResetTokenRecord, error) {
	values, err := s.client.HGetAll(ctx, passwordResetKey(token)).Result()
	if err != nil {
		return nil, err
	}
	if len(values) == 0 {
		return nil, ErrTokenNotFound
	}
	createdAt, err := time.Parse(time.RFC3339Nano, values["created_at"])
	if err != nil {
		createdAt = time.Now().UTC()
	}
	return &models.PasswordResetTokenRecord{
		Token:     values["token"],
		UserID:    values["user_id"],
		Email:     values["email"],
		CreatedAt: createdAt,
	}, nil
}

func (s *redisTokenStore) ConsumePasswordResetToken(ctx context.Context, token string) (*models.PasswordResetTokenRecord, error) {
	record, err := s.GetPasswordResetToken(ctx, token)
	if err != nil {
		return nil, err
	}
	if err := s.client.Del(ctx, passwordResetKey(token)).Err(); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *redisTokenStore) StoreRefreshToken(ctx context.Context, token, userID string, ttl time.Duration) error {
	return s.client.Set(ctx, refreshKey(token), userID, ttl).Err()
}

func (s *redisTokenStore) GetRefreshTokenUserID(ctx context.Context, token string) (string, error) {
	value, err := s.client.Get(ctx, refreshKey(token)).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return "", ErrTokenNotFound
		}
		return "", err
	}
	return value, nil
}

func (s *redisTokenStore) DeleteRefreshToken(ctx context.Context, token string) error {
	return s.client.Del(ctx, refreshKey(token)).Err()
}

func verificationKey(email, code string) string {
	return fmt.Sprintf("user:verify:%s:%s", email, code)
}

func verificationCodeAliasKey(code string) string {
	return fmt.Sprintf("user:verify-code:%s", code)
}

func verificationChallengeKey(id string) string {
	return fmt.Sprintf("user:mfa:%s", id)
}

func refreshKey(token string) string {
	return fmt.Sprintf("user:refresh:%s", token)
}

func passwordResetKey(token string) string {
	return fmt.Sprintf("user:password-reset:%s", token)
}
