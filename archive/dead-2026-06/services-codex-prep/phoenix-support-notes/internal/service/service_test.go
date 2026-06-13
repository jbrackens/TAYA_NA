package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/phoenixbot/phoenix-support-notes/internal/models"
	"github.com/phoenixbot/phoenix-support-notes/internal/repository"
)

type mockRepository struct {
	listNotesFn        func(ctx context.Context, ownerUserID string, page, limit int) ([]*models.SupportNote, int, error)
	listTimelineFn     func(ctx context.Context, ownerUserID string, page, limit int, filters models.TimelineFilters) ([]*models.SupportTimelineEntry, int, error)
	exportTimelineFn   func(ctx context.Context, ownerUserID string, filters models.TimelineFilters) ([]*models.SupportTimelineEntry, error)
	createManualNoteFn func(ctx context.Context, ownerUserID, authorUserID, noteText string) error
}

func (m *mockRepository) ListNotes(ctx context.Context, ownerUserID string, page, limit int) ([]*models.SupportNote, int, error) {
	if m.listNotesFn != nil {
		return m.listNotesFn(ctx, ownerUserID, page, limit)
	}
	return nil, 0, nil
}

func (m *mockRepository) ListTimeline(ctx context.Context, ownerUserID string, page, limit int, filters models.TimelineFilters) ([]*models.SupportTimelineEntry, int, error) {
	if m.listTimelineFn != nil {
		return m.listTimelineFn(ctx, ownerUserID, page, limit, filters)
	}
	return nil, 0, nil
}

func (m *mockRepository) ExportTimeline(ctx context.Context, ownerUserID string, filters models.TimelineFilters) ([]*models.SupportTimelineEntry, error) {
	if m.exportTimelineFn != nil {
		return m.exportTimelineFn(ctx, ownerUserID, filters)
	}
	return nil, nil
}

func (m *mockRepository) CreateManualNote(ctx context.Context, ownerUserID, authorUserID, noteText string) error {
	if m.createManualNoteFn != nil {
		return m.createManualNoteFn(ctx, ownerUserID, authorUserID, noteText)
	}
	return nil
}

func TestListNotesAuthorization(t *testing.T) {
	repo := &mockRepository{}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo)
	_, err := svc.ListNotes(context.Background(), models.AuthClaims{Role: "user"}, "550e8400-e29b-41d4-a716-446655440000", 1, 20)
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestListNotesPaginationNormalization(t *testing.T) {
	calledPage := 0
	calledLimit := 0
	repo := &mockRepository{listNotesFn: func(ctx context.Context, ownerUserID string, page, limit int) ([]*models.SupportNote, int, error) {
		calledPage = page
		calledLimit = limit
		return []*models.SupportNote{}, 0, nil
	}}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo)
	_, err := svc.ListNotes(context.Background(), models.AuthClaims{Role: "admin"}, "550e8400-e29b-41d4-a716-446655440000", 0, 500)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if calledPage != 1 || calledLimit != 200 {
		t.Fatalf("expected normalized page/limit 1/200, got %d/%d", calledPage, calledLimit)
	}
}

func TestListTimelineAuthorization(t *testing.T) {
	repo := &mockRepository{}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo)
	_, err := svc.ListTimeline(context.Background(), models.AuthClaims{Role: "user"}, "550e8400-e29b-41d4-a716-446655440000", 1, 20, models.TimelineFilters{})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestListTimelinePaginationNormalization(t *testing.T) {
	calledPage := 0
	calledLimit := 0
	repo := &mockRepository{listTimelineFn: func(ctx context.Context, ownerUserID string, page, limit int, filters models.TimelineFilters) ([]*models.SupportTimelineEntry, int, error) {
		calledPage = page
		calledLimit = limit
		return []*models.SupportTimelineEntry{}, 0, nil
	}}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo)
	_, err := svc.ListTimeline(context.Background(), models.AuthClaims{Role: "admin"}, "550e8400-e29b-41d4-a716-446655440000", 0, 500, models.TimelineFilters{})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if calledPage != 1 || calledLimit != 200 {
		t.Fatalf("expected normalized page/limit 1/200, got %d/%d", calledPage, calledLimit)
	}
}

func TestListTimelineRejectsInvalidDateRange(t *testing.T) {
	repo := &mockRepository{}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo)
	start := time.Now().UTC()
	end := start.Add(-time.Hour)
	_, err := svc.ListTimeline(context.Background(), models.AuthClaims{Role: "admin"}, "550e8400-e29b-41d4-a716-446655440000", 1, 50, models.TimelineFilters{
		StartDate: &start,
		EndDate:   &end,
	})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestExportTimelineAuthorization(t *testing.T) {
	repo := &mockRepository{}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo)
	_, err := svc.ExportTimelineCSV(context.Background(), models.AuthClaims{Role: "user"}, "550e8400-e29b-41d4-a716-446655440000", models.TimelineFilters{})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestAddManualNoteValidation(t *testing.T) {
	repo := &mockRepository{}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo)
	err := svc.AddManualNote(context.Background(), models.AuthClaims{Role: "admin", UserID: "550e8400-e29b-41d4-a716-446655440001"}, "550e8400-e29b-41d4-a716-446655440000", "   ")
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestAddManualNoteNotFound(t *testing.T) {
	repo := &mockRepository{createManualNoteFn: func(ctx context.Context, ownerUserID, authorUserID, noteText string) error {
		return repository.ErrNotFound
	}}
	svc := NewService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo)
	err := svc.AddManualNote(context.Background(), models.AuthClaims{Role: "admin", UserID: "550e8400-e29b-41d4-a716-446655440001"}, "550e8400-e29b-41d4-a716-446655440000", "hello")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected not found, got %v", err)
	}
}
