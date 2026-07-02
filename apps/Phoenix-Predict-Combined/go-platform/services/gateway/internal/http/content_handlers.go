package http

import (
	"encoding/json"
	"fmt"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/content"
	"phoenix-revival/platform/transport/httpx"
)

func registerContentRoutes(mux *stdhttp.ServeMux, svc *content.Service) {
	// Public delivery
	mux.Handle("/api/v1/content/", httpx.Handle(contentDeliveryHandler(svc)))
	mux.Handle("/api/v1/banners", httpx.Handle(bannersDeliveryHandler(svc)))

	// Admin
	mux.Handle("/api/v1/admin/content/pages", httpx.Handle(adminPagesHandler(svc)))
	mux.Handle("/api/v1/admin/content/pages/", httpx.Handle(adminPageDetailHandler(svc)))
	mux.Handle("/api/v1/admin/banners", httpx.Handle(adminBannersHandler(svc)))
	mux.Handle("/api/v1/admin/banners/", httpx.Handle(adminBannerDetailHandler(svc)))
}

// --- Public Delivery ---

func contentDeliveryHandler(svc *content.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		slug := strings.TrimPrefix(r.URL.Path, "/api/v1/content/")
		slug = strings.TrimSuffix(slug, "/")
		if slug == "" {
			return httpx.BadRequest("slug is required", nil)
		}

		page, err := svc.GetPageBySlug(r.Context(), slug)
		if err != nil {
			return httpx.NotFound(fmt.Sprintf("page not found: %s", slug))
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, publicContentPagePayload(page))
	}
}

func bannersDeliveryHandler(svc *content.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		position := r.URL.Query().Get("position")
		if position == "" {
			position = "hero"
		}

		banners, err := svc.ListActiveBanners(r.Context(), position)
		if err != nil {
			return httpx.Internal("failed to list banners", err)
		}
		if banners == nil {
			banners = []content.Banner{}
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"banners": publicContentBannerPayloads(banners)})
	}
}

// --- Admin Page Endpoints ---

func adminPagesHandler(svc *content.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		role := httpx.RoleFromContext(r.Context())
		if role != "admin" {
			return httpx.Forbidden("admin role required")
		}

		switch r.Method {
		case stdhttp.MethodGet:
			status := r.URL.Query().Get("status")
			pages, err := svc.ListPages(r.Context(), status, 100)
			if err != nil {
				return httpx.Internal("failed to list pages", err)
			}
			if pages == nil {
				pages = []content.Page{}
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"pages": adminContentPagePayloads(pages)})

		case stdhttp.MethodPost:
			var req content.CreatePageRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			if err := validateContentPageCreateLaunchCopy(req); err != nil {
				return err
			}
			req.CreatedBy = httpx.UserIDFromContext(r.Context())

			page, err := svc.CreatePage(r.Context(), req)
			if err != nil {
				return serviceBadRequestError(err, nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusCreated, adminContentPagePayload(page))

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}
}

func adminPageDetailHandler(svc *content.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		role := httpx.RoleFromContext(r.Context())
		if role != "admin" {
			return httpx.Forbidden("admin role required")
		}

		path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/content/pages/")
		parts := strings.SplitN(path, "/", 2)
		id, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return httpx.BadRequest("invalid page id", nil)
		}

		// Lifecycle actions
		if len(parts) == 2 && r.Method == stdhttp.MethodPost {
			switch parts[1] {
			case "publish":
				if err := svc.PublishPage(r.Context(), id); err != nil {
					return httpx.Internal("publish failed", err)
				}
				return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "published"})
			case "unpublish":
				if err := svc.UnpublishPage(r.Context(), id); err != nil {
					return httpx.Internal("unpublish failed", err)
				}
				return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "draft"})
			default:
				return httpx.BadRequest("unknown action: "+parts[1], nil)
			}
		}

		switch r.Method {
		case stdhttp.MethodGet:
			page, err := svc.GetPageByID(r.Context(), id)
			if err != nil {
				return httpx.NotFound(redactLaunchProhibitedUserText(err.Error()))
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, adminContentPagePayload(page))

		case stdhttp.MethodPut:
			var req content.UpdatePageRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			if err := validateContentPageUpdateLaunchCopy(req); err != nil {
				return err
			}
			page, err := svc.UpdatePage(r.Context(), id, req)
			if err != nil {
				return httpx.Internal("update failed", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, adminContentPagePayload(page))

		case stdhttp.MethodDelete:
			if err := svc.DeletePage(r.Context(), id); err != nil {
				return httpx.Internal("delete failed", err)
			}
			w.WriteHeader(stdhttp.StatusNoContent)
			return nil

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPut, stdhttp.MethodDelete, stdhttp.MethodPost)
		}
	}
}

func validateContentPageCreateLaunchCopy(req content.CreatePageRequest) error {
	fields := []struct {
		name  string
		value string
	}{
		{name: "title", value: req.Title},
		{name: "content", value: req.Content},
		{name: "meta_title", value: req.MetaTitle},
		{name: "meta_description", value: req.MetaDescription},
	}
	for _, field := range fields {
		if err := validateLaunchFacingReason(field.name, strings.TrimSpace(field.value)); err != nil {
			return err
		}
	}
	return nil
}

func validateContentPageUpdateLaunchCopy(req content.UpdatePageRequest) error {
	fields := []struct {
		name  string
		value *string
	}{
		{name: "title", value: req.Title},
		{name: "content", value: req.Content},
		{name: "meta_title", value: req.MetaTitle},
		{name: "meta_description", value: req.MetaDescription},
	}
	for _, field := range fields {
		if field.value == nil {
			continue
		}
		if err := validateLaunchFacingReason(field.name, strings.TrimSpace(*field.value)); err != nil {
			return err
		}
	}
	return nil
}

func adminContentPagePayload(page content.Page) content.Page {
	return publicContentPagePayload(page)
}

func adminContentPagePayloads(pages []content.Page) []content.Page {
	out := make([]content.Page, 0, len(pages))
	for _, page := range pages {
		out = append(out, adminContentPagePayload(page))
	}
	return out
}

func publicContentPagePayload(page content.Page) content.Page {
	page.Title = redactLaunchProhibitedUserText(page.Title)
	page.Content = redactLaunchProhibitedUserText(page.Content)
	page.MetaTitle = redactLaunchProhibitedUserText(page.MetaTitle)
	page.MetaDescription = redactLaunchProhibitedUserText(page.MetaDescription)
	if len(page.Blocks) > 0 {
		page.Blocks = append([]content.Block(nil), page.Blocks...)
	}
	for i := range page.Blocks {
		page.Blocks[i].Content = publicContentBlockPayload(page.Blocks[i].Content)
	}
	return page
}

func publicContentBlockPayload(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 || !launchReasonHasProhibitedCopy(string(raw)) {
		return raw
	}
	var payload any
	if err := json.Unmarshal(raw, &payload); err != nil {
		encoded, _ := json.Marshal(launchRedactedUserText)
		return encoded
	}
	redacted := redactLaunchProhibitedJSONStrings(payload)
	encoded, err := json.Marshal(redacted)
	if err != nil {
		encoded, _ = json.Marshal(launchRedactedUserText)
	}
	return encoded
}

func redactLaunchProhibitedJSONStrings(value any) any {
	switch typed := value.(type) {
	case string:
		return redactLaunchProhibitedUserText(typed)
	case []any:
		for i := range typed {
			typed[i] = redactLaunchProhibitedJSONStrings(typed[i])
		}
		return typed
	case map[string]any:
		for key, item := range typed {
			typed[key] = redactLaunchProhibitedJSONStrings(item)
		}
		return typed
	default:
		return value
	}
}

// --- Admin Banner Endpoints ---

func adminBannersHandler(svc *content.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		role := httpx.RoleFromContext(r.Context())
		if role != "admin" {
			return httpx.Forbidden("admin role required")
		}

		switch r.Method {
		case stdhttp.MethodGet:
			banners, err := svc.ListBanners(r.Context(), 100)
			if err != nil {
				return httpx.Internal("failed to list banners", err)
			}
			if banners == nil {
				banners = []content.Banner{}
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"banners": adminContentBannerPayloads(banners)})

		case stdhttp.MethodPost:
			var req content.CreateBannerRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			if err := validateContentBannerCreateLaunchCopy(req); err != nil {
				return err
			}
			req.CreatedBy = httpx.UserIDFromContext(r.Context())

			banner, err := svc.CreateBanner(r.Context(), req)
			if err != nil {
				return serviceBadRequestError(err, nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusCreated, adminContentBannerPayload(banner))

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}
}

func adminBannerDetailHandler(svc *content.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		role := httpx.RoleFromContext(r.Context())
		if role != "admin" {
			return httpx.Forbidden("admin role required")
		}

		path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/banners/")
		id, err := strconv.ParseInt(strings.TrimSuffix(path, "/"), 10, 64)
		if err != nil {
			return httpx.BadRequest("invalid banner id", nil)
		}

		switch r.Method {
		case stdhttp.MethodGet:
			banner, err := svc.GetBanner(r.Context(), id)
			if err != nil {
				return httpx.NotFound(redactLaunchProhibitedUserText(err.Error()))
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, adminContentBannerPayload(banner))

		case stdhttp.MethodPut:
			var req content.UpdateBannerRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			if err := validateContentBannerUpdateLaunchCopy(req); err != nil {
				return err
			}
			banner, err := svc.UpdateBanner(r.Context(), id, req)
			if err != nil {
				return httpx.Internal("update failed", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, adminContentBannerPayload(banner))

		case stdhttp.MethodDelete:
			if err := svc.DeleteBanner(r.Context(), id); err != nil {
				return httpx.Internal("delete failed", err)
			}
			w.WriteHeader(stdhttp.StatusNoContent)
			return nil

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPut, stdhttp.MethodDelete)
		}
	}
}

func validateContentBannerCreateLaunchCopy(req content.CreateBannerRequest) error {
	fields := []struct {
		name  string
		value string
	}{
		{name: "title", value: req.Title},
		{name: "link_url", value: req.LinkURL},
	}
	for _, field := range fields {
		if err := validateLaunchFacingReason(field.name, strings.TrimSpace(field.value)); err != nil {
			return err
		}
	}
	return nil
}

func publicContentBannerPayload(banner content.Banner) content.Banner {
	banner.Title = redactLaunchProhibitedUserText(banner.Title)
	banner.LinkURL = redactLaunchProhibitedUserText(banner.LinkURL)
	return banner
}

func adminContentBannerPayload(banner content.Banner) content.Banner {
	return publicContentBannerPayload(banner)
}

func adminContentBannerPayloads(banners []content.Banner) []content.Banner {
	out := make([]content.Banner, 0, len(banners))
	for _, banner := range banners {
		out = append(out, adminContentBannerPayload(banner))
	}
	return out
}

func publicContentBannerPayloads(banners []content.Banner) []content.Banner {
	out := make([]content.Banner, 0, len(banners))
	for _, banner := range banners {
		out = append(out, publicContentBannerPayload(banner))
	}
	return out
}

func validateContentBannerUpdateLaunchCopy(req content.UpdateBannerRequest) error {
	fields := []struct {
		name  string
		value *string
	}{
		{name: "title", value: req.Title},
		{name: "link_url", value: req.LinkURL},
	}
	for _, field := range fields {
		if field.value == nil {
			continue
		}
		if err := validateLaunchFacingReason(field.name, strings.TrimSpace(*field.value)); err != nil {
			return err
		}
	}
	return nil
}
