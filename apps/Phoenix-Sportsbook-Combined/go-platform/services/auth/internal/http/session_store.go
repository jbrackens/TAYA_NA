package http

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type SessionStore interface {
	Put(session session) error
	GetByAccessToken(accessToken string) (session, bool, error)
	GetByRefreshToken(refreshToken string) (session, bool, error)
	DeleteByAccessToken(accessToken string) error
	DeleteByRefreshToken(refreshToken string) error
	DeleteExpired(now time.Time) error
}

type persistedSessionStore struct {
	Sessions []session `json:"sessions"`
}

type FileBackedSessionStore struct {
	mu sync.RWMutex

	byAccess  map[string]session
	byRefresh map[string]session

	path string
}

func NewFileBackedSessionStore(path string) *FileBackedSessionStore {
	store := &FileBackedSessionStore{
		byAccess:  map[string]session{},
		byRefresh: map[string]session{},
		path:      path,
	}

	if path != "" {
		if err := store.load(); err != nil {
			fmt.Fprintf(os.Stderr, "warning: failed to load auth session store from %s: %v\n", path, err)
		}
	}

	return store
}

func (s *FileBackedSessionStore) Put(current session) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for refreshDigest, existing := range s.byRefresh {
		if existing.UserID == current.UserID {
			delete(s.byRefresh, refreshDigest)
			delete(s.byAccess, existing.AccessTokenDigest)
		}
	}

	s.byRefresh[current.RefreshTokenDigest] = current
	s.byAccess[current.AccessTokenDigest] = current

	return s.persistLocked()
}

func (s *FileBackedSessionStore) GetByAccessToken(accessToken string) (session, bool, error) {
	digest := digestToken(accessToken)

	s.mu.RLock()
	defer s.mu.RUnlock()

	current, found := s.byAccess[digest]
	if !found {
		return session{}, false, nil
	}
	return current, true, nil
}

func (s *FileBackedSessionStore) GetByRefreshToken(refreshToken string) (session, bool, error) {
	digest := digestToken(refreshToken)

	s.mu.RLock()
	defer s.mu.RUnlock()

	current, found := s.byRefresh[digest]
	if !found {
		return session{}, false, nil
	}
	return current, true, nil
}

func (s *FileBackedSessionStore) DeleteByAccessToken(accessToken string) error {
	digest := digestToken(accessToken)

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, found := s.byAccess[digest]; !found {
		return nil
	}
	delete(s.byAccess, digest)
	return s.persistLocked()
}

func (s *FileBackedSessionStore) DeleteByRefreshToken(refreshToken string) error {
	digest := digestToken(refreshToken)

	s.mu.Lock()
	defer s.mu.Unlock()

	current, found := s.byRefresh[digest]
	if !found {
		return nil
	}
	delete(s.byRefresh, digest)
	delete(s.byAccess, current.AccessTokenDigest)

	return s.persistLocked()
}

func (s *FileBackedSessionStore) DeleteExpired(now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	changed := false
	for refreshDigest, current := range s.byRefresh {
		if current.RefreshUntil.Before(now) {
			delete(s.byRefresh, refreshDigest)
			delete(s.byAccess, current.AccessTokenDigest)
			changed = true
			continue
		}

		if current.AccessUntil.Before(now) {
			if _, found := s.byAccess[current.AccessTokenDigest]; found {
				delete(s.byAccess, current.AccessTokenDigest)
				changed = true
			}
		}
	}

	if !changed {
		return nil
	}
	return s.persistLocked()
}

func (s *FileBackedSessionStore) load() error {
	raw, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}

	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 {
		return nil
	}

	var snapshot persistedSessionStore
	if err := json.Unmarshal(trimmed, &snapshot); err != nil {
		return err
	}

	now := time.Now().UTC()
	for _, current := range snapshot.Sessions {
		if current.RefreshTokenDigest == "" || current.RefreshUntil.Before(now) {
			continue
		}

		s.byRefresh[current.RefreshTokenDigest] = current
		if current.AccessTokenDigest != "" && current.AccessUntil.After(now) {
			s.byAccess[current.AccessTokenDigest] = current
		}
	}

	return nil
}

func (s *FileBackedSessionStore) persistLocked() error {
	if s.path == "" {
		return nil
	}

	snapshot := persistedSessionStore{
		Sessions: make([]session, 0, len(s.byRefresh)),
	}
	for _, current := range s.byRefresh {
		snapshot.Sessions = append(snapshot.Sessions, current)
	}

	targetDir := filepath.Dir(s.path)
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return err
	}

	tempPath := s.path + ".tmp"
	file, err := os.Create(tempPath)
	if err != nil {
		return err
	}

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(snapshot); err != nil {
		_ = file.Close()
		_ = os.Remove(tempPath)
		return err
	}

	if err := file.Close(); err != nil {
		_ = os.Remove(tempPath)
		return err
	}

	if err := os.Rename(tempPath, s.path); err != nil {
		_ = os.Remove(tempPath)
		return err
	}

	return nil
}
