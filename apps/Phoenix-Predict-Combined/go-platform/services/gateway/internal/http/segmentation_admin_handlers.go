package http

import (
	"context"
	"encoding/json"
	"log/slog"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/segmentation"
	"phoenix-revival/platform/transport/httpx"
)

// segmentationStore is the consumer-side slice the admin routes need so
// handler tests can stub it. *segmentation.Store satisfies it.
type segmentationStore interface {
	CreateTag(ctx context.Context, name, description string) (*segmentation.Tag, error)
	ListTags(ctx context.Context) ([]segmentation.Tag, error)
	DeleteTag(ctx context.Context, tagID int64) error
	AssignTag(ctx context.Context, tagID int64, userID, assignedBy string) error
	UnassignTag(ctx context.Context, tagID int64, userID string) error
	UsersForTag(ctx context.Context, tagID int64, limit, offset int) ([]string, error)
	TagsForUser(ctx context.Context, userID string) ([]segmentation.Tag, error)
}

// registerSegmentationAdminRoutes wires the CRM tag surface:
//
//	GET    /api/v1/admin/segments/tags                 -> list tags        (segments:read)
//	POST   /api/v1/admin/segments/tags                 -> create tag       (segments:write)
//	DELETE /api/v1/admin/segments/tags/{id}            -> delete tag       (segments:write)
//	GET    /api/v1/admin/segments/tags/{id}/users      -> users for tag    (segments:read)
//	POST   /api/v1/admin/segments/tags/{id}/assign     -> {userId} assign  (segments:write)
//	POST   /api/v1/admin/segments/tags/{id}/unassign   -> {userId}         (segments:write)
//	GET    /api/v1/admin/segments/users/{userId}/tags  -> tags for user    (segments:read)
func registerSegmentationAdminRoutes(mux *stdhttp.ServeMux, store segmentationStore) {
	mux.Handle("/api/v1/admin/segments/tags", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireAdminPermission(r, "segments:read"); err != nil {
				return err
			}
			tags, err := store.ListTags(r.Context())
			if err != nil {
				return httpx.Internal("failed to list tags", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"tags": tags})
		case stdhttp.MethodPost:
			if err := requireAdminPermission(r, "segments:write"); err != nil {
				return err
			}
			var body struct {
				Name        string `json:"name"`
				Description string `json:"description"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			if err := validateLaunchFacingReason("name", strings.TrimSpace(body.Name)); err != nil {
				return err
			}
			if err := validateLaunchFacingReason("description", strings.TrimSpace(body.Description)); err != nil {
				return err
			}
			tag, err := store.CreateTag(r.Context(), body.Name, body.Description)
			if err != nil {
				return mapSegmentationError(err)
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "segment.tag_created", strconv.FormatInt(tag.ID, 10),
				map[string]any{"name": tag.Name})
			return httpx.WriteJSON(w, stdhttp.StatusCreated, tag)
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	const tagsPrefix = "/api/v1/admin/segments/tags/"
	mux.Handle(tagsPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, tagsPrefix), "/")
		parts := strings.Split(rest, "/")
		tagID, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return httpx.BadRequest("invalid tag id", nil)
		}

		// /tags/{id}  (DELETE)
		if len(parts) == 1 {
			if r.Method != stdhttp.MethodDelete {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodDelete)
			}
			if err := requireAdminPermission(r, "segments:write"); err != nil {
				return err
			}
			if err := store.DeleteTag(r.Context(), tagID); err != nil {
				return mapSegmentationError(err)
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "segment.tag_deleted", strconv.FormatInt(tagID, 10), nil)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"id": tagID, "deleted": true})
		}

		if len(parts) != 2 {
			return httpx.NotFound("unknown segmentation path")
		}
		switch parts[1] {
		case "users":
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			if err := requireAdminPermission(r, "segments:read"); err != nil {
				return err
			}
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
			users, err := store.UsersForTag(r.Context(), tagID, limit, offset)
			if err != nil {
				return httpx.Internal("failed to list tag members", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"userIds": users, "total": len(users)})
		case "assign", "unassign":
			if r.Method != stdhttp.MethodPost {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
			}
			if err := requireAdminPermission(r, "segments:write"); err != nil {
				return err
			}
			var body struct {
				UserID string `json:"userId"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			userID := strings.TrimSpace(body.UserID)
			if userID == "" {
				return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
			}
			if parts[1] == "assign" {
				if err := store.AssignTag(r.Context(), tagID, userID, userIDFromRequest(r)); err != nil {
					return mapSegmentationError(err)
				}
				recordProviderOpsAuditAction(userIDFromRequest(r), "segment.tag_assigned", userID,
					map[string]any{"tagId": tagID})
			} else {
				if err := store.UnassignTag(r.Context(), tagID, userID); err != nil {
					return mapSegmentationError(err)
				}
				recordProviderOpsAuditAction(userIDFromRequest(r), "segment.tag_unassigned", userID,
					map[string]any{"tagId": tagID})
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"tagId": tagID, "userId": userID})
		default:
			return httpx.NotFound("unknown segmentation path")
		}
	}))

	const usersPrefix = "/api/v1/admin/segments/users/"
	mux.Handle(usersPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "segments:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, usersPrefix), "/")
		parts := strings.Split(rest, "/")
		if len(parts) != 2 || parts[1] != "tags" || parts[0] == "" {
			return httpx.NotFound("unknown segmentation path")
		}
		tags, err := store.TagsForUser(r.Context(), parts[0])
		if err != nil {
			return httpx.Internal("failed to list user tags", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"tags": tags})
	}))

	slog.Info("admin segmentation routes registered")
}

func mapSegmentationError(err error) error {
	switch err {
	case segmentation.ErrNotFound:
		return httpx.NotFound("tag not found")
	case segmentation.ErrInvalidTag:
		return httpx.BadRequest("tag name (and, for assignment, userId) is required", nil)
	case segmentation.ErrDuplicate:
		return httpx.Conflict("a tag with that name already exists", nil)
	default:
		return httpx.Internal("segmentation operation failed", err)
	}
}
