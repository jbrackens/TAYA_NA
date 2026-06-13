package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/phoenixbot/phoenix-config/internal/models"
	"github.com/phoenixbot/phoenix-config/internal/repository"
)

type repoStub struct {
	current     *models.TermsDocument
	getErr      error
	createErr   error
	lastVersion string
}

func (r *repoStub) GetCurrentTerms(ctx context.Context) (*models.TermsDocument, error) {
	if r.getErr != nil {
		return nil, r.getErr
	}
	return r.current, nil
}

func (r *repoStub) CreateTerms(ctx context.Context, authorUserID, version, content string, daysThreshold int) error {
	r.lastVersion = version
	return r.createErr
}

func newTestService(repo repository.Repository) Service {
	return NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo)
}

func TestGetCurrentTermsAuthorization(t *testing.T) {
	svc := newTestService(&repoStub{current: &models.TermsDocument{ID: "t1", CurrentTermsVersion: "v1", CreatedAt: time.Now()}})
	_, err := svc.GetCurrentTerms(context.Background(), &models.AuthClaims{UserID: "u1", Role: "user"})
	require.ErrorIs(t, err, ErrForbidden)
}

func TestGetCurrentTermsPublic(t *testing.T) {
	svc := newTestService(&repoStub{current: &models.TermsDocument{ID: "t1", CurrentTermsVersion: "v1", CreatedAt: time.Now()}})
	doc, err := svc.GetCurrentTerms(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, "v1", doc.CurrentTermsVersion)
}

func TestCreateTermsValidationAndConflict(t *testing.T) {
	repo := &repoStub{}
	svc := newTestService(repo)
	err := svc.CreateTerms(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, models.UpsertTermsRequest{})
	require.ErrorIs(t, err, ErrInvalidInput)

	repo.createErr = repository.ErrAlreadyExists
	err = svc.CreateTerms(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, models.UpsertTermsRequest{CurrentTermsVersion: "v2", TermsContent: "terms"})
	require.ErrorIs(t, err, ErrConflict)
}

func TestCreateTermsForbiddenAndNotFound(t *testing.T) {
	repo := &repoStub{createErr: repository.ErrNotFound}
	svc := newTestService(repo)
	err := svc.CreateTerms(context.Background(), models.AuthClaims{UserID: "u1", Role: "operator"}, models.UpsertTermsRequest{CurrentTermsVersion: "v2", TermsContent: "terms"})
	require.ErrorIs(t, err, ErrForbidden)

	err = svc.CreateTerms(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, models.UpsertTermsRequest{CurrentTermsVersion: "v2", TermsContent: "terms"})
	require.ErrorIs(t, err, ErrNotFound)
}

func TestGetCurrentTermsNotFoundPassThrough(t *testing.T) {
	svc := newTestService(&repoStub{getErr: repository.ErrNotFound})
	_, err := svc.GetCurrentTerms(context.Background(), nil)
	require.ErrorIs(t, err, ErrNotFound)
}

func TestCreateTermsPassThroughUnexpectedError(t *testing.T) {
	svc := newTestService(&repoStub{createErr: errors.New("boom")})
	err := svc.CreateTerms(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, models.UpsertTermsRequest{CurrentTermsVersion: "v3", TermsContent: "terms"})
	require.EqualError(t, err, "boom")
}
