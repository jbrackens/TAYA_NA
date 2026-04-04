package http

import (
	"path/filepath"
	"testing"
	"time"
)

func TestFileBackedSessionStoreRoundTrip(t *testing.T) {
	storePath := filepath.Join(t.TempDir(), "sessions.json")
	store := NewFileBackedSessionStore(storePath)

	accessToken := "atk_test_access"
	refreshToken := "rtk_test_refresh"
	s := session{
		UserID:             "user-demo",
		Username:           "demo@phoenix.local",
		AccessTokenDigest:  digestToken(accessToken),
		RefreshTokenDigest: digestToken(refreshToken),
		AccessUntil:        time.Now().UTC().Add(15 * time.Minute),
		RefreshUntil:       time.Now().UTC().Add(24 * time.Hour),
		IssuedAt:           time.Now().UTC(),
	}

	if err := store.Put(s); err != nil {
		t.Fatalf("put session: %v", err)
	}

	reloaded := NewFileBackedSessionStore(storePath)
	loaded, found, err := reloaded.GetByRefreshToken(refreshToken)
	if err != nil {
		t.Fatalf("get by refresh token: %v", err)
	}
	if !found {
		t.Fatalf("expected stored refresh token to be found")
	}
	if loaded.UserID != s.UserID {
		t.Fatalf("expected user %s, got %s", s.UserID, loaded.UserID)
	}
}

func TestFileBackedSessionStoreDeleteByRefreshRemovesAccessEntry(t *testing.T) {
	store := NewFileBackedSessionStore("")

	accessToken := "atk_test_access"
	refreshToken := "rtk_test_refresh"
	s := session{
		UserID:             "user-demo",
		Username:           "demo@phoenix.local",
		AccessTokenDigest:  digestToken(accessToken),
		RefreshTokenDigest: digestToken(refreshToken),
		AccessUntil:        time.Now().UTC().Add(15 * time.Minute),
		RefreshUntil:       time.Now().UTC().Add(24 * time.Hour),
		IssuedAt:           time.Now().UTC(),
	}

	if err := store.Put(s); err != nil {
		t.Fatalf("put session: %v", err)
	}
	if err := store.DeleteByRefreshToken(refreshToken); err != nil {
		t.Fatalf("delete by refresh token: %v", err)
	}

	if _, found, err := store.GetByRefreshToken(refreshToken); err != nil {
		t.Fatalf("lookup deleted refresh token: %v", err)
	} else if found {
		t.Fatalf("expected refresh token to be deleted")
	}

	if _, found, err := store.GetByAccessToken(accessToken); err != nil {
		t.Fatalf("lookup deleted access token: %v", err)
	} else if found {
		t.Fatalf("expected access token to be deleted with refresh token")
	}
}

func TestFileBackedSessionStorePrunesExpiredAccessButKeepsRefresh(t *testing.T) {
	store := NewFileBackedSessionStore("")

	accessToken := "atk_expired"
	refreshToken := "rtk_valid"
	s := session{
		UserID:             "user-demo",
		Username:           "demo@phoenix.local",
		AccessTokenDigest:  digestToken(accessToken),
		RefreshTokenDigest: digestToken(refreshToken),
		AccessUntil:        time.Now().UTC().Add(-1 * time.Minute),
		RefreshUntil:       time.Now().UTC().Add(24 * time.Hour),
		IssuedAt:           time.Now().UTC().Add(-2 * time.Minute),
	}

	if err := store.Put(s); err != nil {
		t.Fatalf("put session: %v", err)
	}
	if err := store.DeleteExpired(time.Now().UTC()); err != nil {
		t.Fatalf("delete expired: %v", err)
	}

	if _, found, err := store.GetByAccessToken(accessToken); err != nil {
		t.Fatalf("lookup expired access token: %v", err)
	} else if found {
		t.Fatalf("expected expired access token to be pruned")
	}

	if _, found, err := store.GetByRefreshToken(refreshToken); err != nil {
		t.Fatalf("lookup refresh token: %v", err)
	} else if !found {
		t.Fatalf("expected refresh token to remain valid")
	}
}
