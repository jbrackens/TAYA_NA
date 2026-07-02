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
	RunQuery(ctx context.Context, q segmentation.Query) (*segmentation.QueryResult, error)
	CreateCampaign(ctx context.Context, name string, tagID int64, actionType, actionRef, createdBy string) (*segmentation.Campaign, error)
	ListCampaigns(ctx context.Context) ([]segmentation.Campaign, error)
	GetCampaign(ctx context.Context, id int64) (*segmentation.Campaign, error)
	UpdateCampaignStatus(ctx context.Context, id int64, status string) (*segmentation.Campaign, error)
	PreviewCampaign(ctx context.Context, id int64) (int, error)
}

// campaignDispatchGate reports whether campaign dispatch is enabled in this
// environment. Backed by the platform-config flag crm.campaign_dispatch_enabled
// (default FALSE) so launch mode — where user-facing sends are prohibited —
// keeps dispatch fail-closed and unreachable.
type campaignDispatchGate interface {
	GetBool(ctx context.Context, key string, fallback bool) bool
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
func registerSegmentationAdminRoutes(mux *stdhttp.ServeMux, store segmentationStore, dispatchGate campaignDispatchGate) {
	registerSegmentationCampaignRoutes(mux, store, dispatchGate)
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

	// Query builder (P2-2 slice 2): POST a filter, get matching user ids.
	mux.Handle("/api/v1/admin/segments/query", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "segments:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		var body struct {
			TagID        int64  `json:"tagId"`
			Status       string `json:"status"`
			CreatedAfter string `json:"createdAfter"`
			Limit        int    `json:"limit"`
			Offset       int    `json:"offset"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		if s := strings.TrimSpace(body.Status); s != "" {
			// Bound the status filter to the known punter states so a caller
			// cannot probe arbitrary values.
			switch s {
			case "active", "suspended", "self_excluded", "deactivated", "inactive":
			default:
				return httpx.BadRequest("unknown status filter", map[string]any{"field": "status"})
			}
		}
		res, err := store.RunQuery(r.Context(), segmentation.Query{
			TagID:        body.TagID,
			Status:       body.Status,
			CreatedAfter: body.CreatedAfter,
			Limit:        body.Limit,
			Offset:       body.Offset,
		})
		if err != nil {
			return httpx.Internal("failed to run segment query", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, res)
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
	case segmentation.ErrCampaignInvalid:
		return httpx.BadRequest("campaign name, a valid target tag, and action type (notification|bonus) are required", nil)
	case segmentation.ErrCampaignMissing:
		return httpx.NotFound("campaign not found")
	default:
		return httpx.Internal("segmentation operation failed", err)
	}
}

// campaignDispatchFlag is the platform-config key that must be true (in a
// non-launch environment) before a campaign can dispatch. Default fail-closed.
const campaignDispatchFlag = "crm.campaign_dispatch_enabled"

func registerSegmentationCampaignRoutes(mux *stdhttp.ServeMux, store segmentationStore, gate campaignDispatchGate) {
	mux.Handle("/api/v1/admin/segments/campaigns", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireAdminPermission(r, "segments:read"); err != nil {
				return err
			}
			campaigns, err := store.ListCampaigns(r.Context())
			if err != nil {
				return httpx.Internal("failed to list campaigns", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"campaigns": campaigns})
		case stdhttp.MethodPost:
			if err := requireAdminPermission(r, "segments:write"); err != nil {
				return err
			}
			var body struct {
				Name       string `json:"name"`
				TagID      int64  `json:"tagId"`
				ActionType string `json:"actionType"`
				ActionRef  string `json:"actionRef"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			if err := validateLaunchFacingReason("name", strings.TrimSpace(body.Name)); err != nil {
				return err
			}
			c, err := store.CreateCampaign(r.Context(), body.Name, body.TagID, strings.TrimSpace(body.ActionType), strings.TrimSpace(body.ActionRef), userIDFromRequest(r))
			if err != nil {
				return mapSegmentationError(err)
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "segment.campaign_created", strconv.FormatInt(c.ID, 10),
				map[string]any{"name": c.Name, "actionType": c.ActionType})
			return httpx.WriteJSON(w, stdhttp.StatusCreated, c)
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	const prefix = "/api/v1/admin/segments/campaigns/"
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
		parts := strings.Split(rest, "/")
		id, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return httpx.BadRequest("invalid campaign id", nil)
		}

		// /campaigns/{id}  (GET | PUT status)
		if len(parts) == 1 {
			switch r.Method {
			case stdhttp.MethodGet:
				if err := requireAdminPermission(r, "segments:read"); err != nil {
					return err
				}
				c, err := store.GetCampaign(r.Context(), id)
				if err != nil {
					return mapSegmentationError(err)
				}
				return httpx.WriteJSON(w, stdhttp.StatusOK, c)
			case stdhttp.MethodPut:
				if err := requireAdminPermission(r, "segments:write"); err != nil {
					return err
				}
				var body struct {
					Status string `json:"status"`
				}
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					return httpx.BadRequest("invalid request body", nil)
				}
				c, err := store.UpdateCampaignStatus(r.Context(), id, strings.TrimSpace(body.Status))
				if err != nil {
					return mapSegmentationError(err)
				}
				recordProviderOpsAuditAction(userIDFromRequest(r), "segment.campaign_updated", strconv.FormatInt(id, 10),
					map[string]any{"status": c.Status})
				return httpx.WriteJSON(w, stdhttp.StatusOK, c)
			default:
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPut)
			}
		}
		if len(parts) != 2 {
			return httpx.NotFound("unknown campaign path")
		}
		switch parts[1] {
		case "preview":
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			if err := requireAdminPermission(r, "segments:read"); err != nil {
				return err
			}
			count, err := store.PreviewCampaign(r.Context(), id)
			if err != nil {
				return mapSegmentationError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"campaignId": id, "targetUserCount": count})
		case "execute":
			if r.Method != stdhttp.MethodPost {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
			}
			if err := requireAdminPermission(r, "segments:write"); err != nil {
				return err
			}
			// Launch-safety boundary: dispatch is fail-closed. In launch mode
			// (flag default false) mass user-facing sends are prohibited, so
			// execute is inert — a 403 the unreachability test asserts.
			if !gate.GetBool(r.Context(), campaignDispatchFlag, false) {
				return httpx.Forbidden("campaign dispatch is disabled in this environment")
			}
			// Enabled (non-launch): the dispatch worker is a deliberate
			// follow-up — return 501 rather than fake a send.
			return httpx.NewError(stdhttp.StatusNotImplemented, "not_implemented",
				"campaign dispatch worker is not yet wired", nil, nil)
		default:
			return httpx.NotFound("unknown campaign path")
		}
	}))
}
