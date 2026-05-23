package http

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisSessionStore implements SessionStore on Redis so sessions survive an
// auth-service restart and are shared across multiple auth instances. The
// FileBackedSessionStore keeps sessions in a per-process map persisted to a
// single file, which neither survives horizontal scaling (each instance has
// its own file) nor lets a second instance validate a token minted by the
// first.
//
// Drop-in for FileBackedSessionStore: the token-taking methods receive a RAW
// token and digest it internally (same contract as the file store, including
// the digest-the-argument behaviour the handlers rely on).
//
// Storage layout (small JSON blobs, all TTL'd so expiry is automatic):
//   auth:sess:acc:<accessDigest>  -> session JSON   (TTL = AccessUntil-now)
//   auth:sess:ref:<refreshDigest> -> session JSON   (TTL = RefreshUntil-now)
//   auth:sess:user:<userID>       -> SET{refreshDigest...} (index for eviction)
type RedisSessionStore struct {
	rc *redis.Client
}

// NewRedisSessionStore returns a Redis-backed session store using the given
// client. The caller owns the client lifecycle.
func NewRedisSessionStore(rc *redis.Client) *RedisSessionStore {
	return &RedisSessionStore{rc: rc}
}

const redisSessionOpTimeout = 3 * time.Second

func sessAccessKey(digest string) string  { return "auth:sess:acc:" + digest }
func sessRefreshKey(digest string) string { return "auth:sess:ref:" + digest }
func sessUserKey(userID string) string    { return "auth:sess:user:" + userID }

func sessCtx() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), redisSessionOpTimeout)
}

// Put stores the session and enforces one active session per user by evicting
// any pre-existing sessions for the same user first (mirrors
// FileBackedSessionStore.Put).
func (s *RedisSessionStore) Put(current session) error {
	ctx, cancel := sessCtx()
	defer cancel()

	if err := s.evictUser(ctx, current.UserID); err != nil {
		return err
	}

	now := time.Now().UTC()
	refTTL := current.RefreshUntil.Sub(now)
	if refTTL <= 0 {
		// Nothing durable to store — the refresh token is already expired.
		return nil
	}
	blob, err := json.Marshal(current)
	if err != nil {
		return err
	}

	pipe := s.rc.TxPipeline()
	if accTTL := current.AccessUntil.Sub(now); accTTL > 0 {
		pipe.Set(ctx, sessAccessKey(current.AccessTokenDigest), blob, accTTL)
	}
	pipe.Set(ctx, sessRefreshKey(current.RefreshTokenDigest), blob, refTTL)
	pipe.SAdd(ctx, sessUserKey(current.UserID), current.RefreshTokenDigest)
	pipe.Expire(ctx, sessUserKey(current.UserID), refTTL)
	_, err = pipe.Exec(ctx)
	return err
}

// evictUser deletes every session referenced by the user's index set.
func (s *RedisSessionStore) evictUser(ctx context.Context, userID string) error {
	uk := sessUserKey(userID)
	refDigests, err := s.rc.SMembers(ctx, uk).Result()
	if err != nil {
		return err
	}
	for _, rd := range refDigests {
		if blob, gerr := s.rc.Get(ctx, sessRefreshKey(rd)).Bytes(); gerr == nil {
			var existing session
			if json.Unmarshal(blob, &existing) == nil && existing.AccessTokenDigest != "" {
				s.rc.Del(ctx, sessAccessKey(existing.AccessTokenDigest))
			}
		}
		s.rc.Del(ctx, sessRefreshKey(rd))
	}
	return s.rc.Del(ctx, uk).Err()
}

func (s *RedisSessionStore) getByKey(key string) (session, bool, error) {
	ctx, cancel := sessCtx()
	defer cancel()
	blob, err := s.rc.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return session{}, false, nil
	}
	if err != nil {
		return session{}, false, err
	}
	var sess session
	if err := json.Unmarshal(blob, &sess); err != nil {
		return session{}, false, err
	}
	return sess, true, nil
}

func (s *RedisSessionStore) GetByAccessToken(accessToken string) (session, bool, error) {
	return s.getByKey(sessAccessKey(digestToken(accessToken)))
}

func (s *RedisSessionStore) GetByRefreshToken(refreshToken string) (session, bool, error) {
	return s.getByKey(sessRefreshKey(digestToken(refreshToken)))
}

func (s *RedisSessionStore) DeleteByAccessToken(accessToken string) error {
	ctx, cancel := sessCtx()
	defer cancel()
	digest := digestToken(accessToken)
	blob, err := s.rc.Get(ctx, sessAccessKey(digest)).Bytes()
	if err == redis.Nil {
		return nil
	}
	if err != nil {
		return err
	}
	var sess session
	if jerr := json.Unmarshal(blob, &sess); jerr != nil {
		return s.rc.Del(ctx, sessAccessKey(digest)).Err()
	}
	pipe := s.rc.TxPipeline()
	pipe.Del(ctx, sessAccessKey(digest))
	if sess.RefreshTokenDigest != "" {
		pipe.Del(ctx, sessRefreshKey(sess.RefreshTokenDigest))
	}
	if sess.UserID != "" {
		pipe.SRem(ctx, sessUserKey(sess.UserID), sess.RefreshTokenDigest)
	}
	_, err = pipe.Exec(ctx)
	return err
}

func (s *RedisSessionStore) DeleteByRefreshToken(refreshToken string) error {
	ctx, cancel := sessCtx()
	defer cancel()
	digest := digestToken(refreshToken)
	blob, err := s.rc.Get(ctx, sessRefreshKey(digest)).Bytes()
	if err == redis.Nil {
		return nil
	}
	if err != nil {
		return err
	}
	var sess session
	_ = json.Unmarshal(blob, &sess)
	pipe := s.rc.TxPipeline()
	if sess.AccessTokenDigest != "" {
		pipe.Del(ctx, sessAccessKey(sess.AccessTokenDigest))
	}
	pipe.Del(ctx, sessRefreshKey(digest))
	if sess.UserID != "" {
		pipe.SRem(ctx, sessUserKey(sess.UserID), digest)
	}
	_, err = pipe.Exec(ctx)
	return err
}

// DeleteExpired is a no-op for Redis: access/refresh keys carry TTLs and expire
// on their own. Stale user-index members are pruned lazily by ListByUserID.
func (s *RedisSessionStore) DeleteExpired(_ time.Time) error {
	return nil
}

func (s *RedisSessionStore) ListByUserID(userID string) ([]session, error) {
	ctx, cancel := sessCtx()
	defer cancel()
	uk := sessUserKey(userID)
	refDigests, err := s.rc.SMembers(ctx, uk).Result()
	if err != nil {
		return nil, err
	}
	var result []session
	var stale []interface{}
	for _, rd := range refDigests {
		blob, gerr := s.rc.Get(ctx, sessRefreshKey(rd)).Bytes()
		if gerr == redis.Nil {
			stale = append(stale, rd)
			continue
		}
		if gerr != nil {
			return nil, gerr
		}
		var sess session
		if json.Unmarshal(blob, &sess) == nil {
			result = append(result, sess)
		}
	}
	if len(stale) > 0 {
		s.rc.SRem(ctx, uk, stale...)
	}
	return result, nil
}

// DeleteBySessionID removes a session identified by a token digest (access or
// refresh), matching FileBackedSessionStore.DeleteBySessionID which compares
// the id against both digests.
func (s *RedisSessionStore) DeleteBySessionID(sessionID string) error {
	ctx, cancel := sessCtx()
	defer cancel()

	// Refresh-digest match.
	if blob, err := s.rc.Get(ctx, sessRefreshKey(sessionID)).Bytes(); err == nil {
		var sess session
		_ = json.Unmarshal(blob, &sess)
		pipe := s.rc.TxPipeline()
		if sess.AccessTokenDigest != "" {
			pipe.Del(ctx, sessAccessKey(sess.AccessTokenDigest))
		}
		pipe.Del(ctx, sessRefreshKey(sessionID))
		if sess.UserID != "" {
			pipe.SRem(ctx, sessUserKey(sess.UserID), sessionID)
		}
		_, err = pipe.Exec(ctx)
		return err
	}

	// Access-digest match.
	if blob, err := s.rc.Get(ctx, sessAccessKey(sessionID)).Bytes(); err == nil {
		var sess session
		_ = json.Unmarshal(blob, &sess)
		pipe := s.rc.TxPipeline()
		pipe.Del(ctx, sessAccessKey(sessionID))
		if sess.RefreshTokenDigest != "" {
			pipe.Del(ctx, sessRefreshKey(sess.RefreshTokenDigest))
			if sess.UserID != "" {
				pipe.SRem(ctx, sessUserKey(sess.UserID), sess.RefreshTokenDigest)
			}
		}
		_, err = pipe.Exec(ctx)
		return err
	}

	return nil
}
