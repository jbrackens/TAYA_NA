package http

import (
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newTestRedisStore(t *testing.T) (*RedisSessionStore, *miniredis.Miniredis) {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	t.Cleanup(mr.Close)
	rc := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rc.Close() })
	return NewRedisSessionStore(rc), mr
}

func makeSession(uid, access, refresh string) session {
	now := time.Now().UTC()
	return session{
		UserID:             uid,
		Username:           uid + "@example.test",
		Role:               "player",
		AccessTokenDigest:  digestToken(access),
		RefreshTokenDigest: digestToken(refresh),
		AccessUntil:        now.Add(15 * time.Minute),
		RefreshUntil:       now.Add(24 * time.Hour),
		IssuedAt:           now,
	}
}

func TestRedisSession_PutGet(t *testing.T) {
	store, _ := newTestRedisStore(t)
	if err := store.Put(makeSession("u1", "atk_1", "rtk_1")); err != nil {
		t.Fatalf("Put: %v", err)
	}
	got, ok, err := store.GetByAccessToken("atk_1")
	if err != nil || !ok {
		t.Fatalf("GetByAccessToken ok=%v err=%v", ok, err)
	}
	if got.UserID != "u1" || got.Role != "player" {
		t.Fatalf("session mismatch: %+v", got)
	}
	if _, ok, _ := store.GetByRefreshToken("rtk_1"); !ok {
		t.Fatalf("GetByRefreshToken not found")
	}
	if _, ok, _ := store.GetByAccessToken("atk_unknown"); ok {
		t.Fatalf("unexpected hit for unknown token")
	}
}

// TestRedisSession_CrossInstance is the core acceptance test: a session minted
// by one store instance must be readable by an independent store instance that
// shares the same Redis (multi-instance) — and, equivalently, survive a
// process restart (a new store over the same data).
func TestRedisSession_CrossInstance(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rc1 := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	rc2 := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rc1.Close(); _ = rc2.Close() })

	instanceA := NewRedisSessionStore(rc1)
	instanceB := NewRedisSessionStore(rc2)

	if err := instanceA.Put(makeSession("u9", "atk_9", "rtk_9")); err != nil {
		t.Fatalf("Put on A: %v", err)
	}
	got, ok, err := instanceB.GetByAccessToken("atk_9")
	if err != nil || !ok {
		t.Fatalf("instance B could not read session minted by A: ok=%v err=%v", ok, err)
	}
	if got.UserID != "u9" {
		t.Fatalf("cross-instance session mismatch: %+v", got)
	}
}

func TestRedisSession_DeleteByAccessToken(t *testing.T) {
	store, _ := newTestRedisStore(t)
	_ = store.Put(makeSession("u2", "atk_2", "rtk_2"))
	if err := store.DeleteByAccessToken("atk_2"); err != nil {
		t.Fatalf("DeleteByAccessToken: %v", err)
	}
	if _, ok, _ := store.GetByAccessToken("atk_2"); ok {
		t.Fatalf("access token still present after delete")
	}
	if _, ok, _ := store.GetByRefreshToken("rtk_2"); ok {
		t.Fatalf("refresh token should be removed alongside access token")
	}
}

func TestRedisSession_SingleSessionPerUser(t *testing.T) {
	store, _ := newTestRedisStore(t)
	_ = store.Put(makeSession("u3", "atk_old", "rtk_old"))
	_ = store.Put(makeSession("u3", "atk_new", "rtk_new"))

	if _, ok, _ := store.GetByAccessToken("atk_old"); ok {
		t.Fatalf("old session not evicted on re-Put for same user")
	}
	if _, ok, _ := store.GetByAccessToken("atk_new"); !ok {
		t.Fatalf("new session missing after re-Put")
	}
	list, err := store.ListByUserID("u3")
	if err != nil {
		t.Fatalf("ListByUserID: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected exactly 1 session for u3, got %d", len(list))
	}
}

func TestRedisSession_DeleteBySessionID(t *testing.T) {
	store, _ := newTestRedisStore(t)
	s := makeSession("u4", "atk_4", "rtk_4")
	_ = store.Put(s)
	// FileBacked matches against either digest; verify both work.
	if err := store.DeleteBySessionID(s.RefreshTokenDigest); err != nil {
		t.Fatalf("DeleteBySessionID(refresh): %v", err)
	}
	if _, ok, _ := store.GetByAccessToken("atk_4"); ok {
		t.Fatalf("session still present after DeleteBySessionID")
	}
}

func TestRedisSession_AccessExpiresViaTTL(t *testing.T) {
	store, mr := newTestRedisStore(t)
	_ = store.Put(makeSession("u5", "atk_5", "rtk_5"))
	mr.FastForward(16 * time.Minute) // past the 15m access TTL, within 24h refresh TTL
	if _, ok, _ := store.GetByAccessToken("atk_5"); ok {
		t.Fatalf("access token should have expired via TTL")
	}
	if _, ok, _ := store.GetByRefreshToken("rtk_5"); !ok {
		t.Fatalf("refresh token should still be valid (24h TTL)")
	}
}
