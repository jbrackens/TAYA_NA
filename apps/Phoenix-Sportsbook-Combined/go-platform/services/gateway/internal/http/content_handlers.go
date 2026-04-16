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
		return httpx.WriteJSON(w, stdhttp.StatusOK, page)
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
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"banners": banners})
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
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"pages": pages})

		case stdhttp.MethodPost:
			var req content.CreatePageRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			req.CreatedBy = httpx.UserIDFromContext(r.Context())

			page, err := svc.CreatePage(r.Context(), req)
			if err != nil {
				return httpx.BadRequest(err.Error(), nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusCreated, page)

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
				return httpx.NotFound(err.Error())
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, page)

		case stdhttp.MethodPut:
			var req content.UpdatePageRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			page, err := svc.UpdatePage(r.Context(), id, req)
			if err != nil {
				return httpx.Internal("update failed", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, page)

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
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"banners": banners})

		case stdhttp.MethodPost:
			var req content.CreateBannerRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			req.CreatedBy = httpx.UserIDFromContext(r.Context())

			banner, err := svc.CreateBanner(r.Context(), req)
			if err != nil {
				return httpx.BadRequest(err.Error(), nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusCreated, banner)

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
				return httpx.NotFound(err.Error())
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, banner)

		case stdhttp.MethodPut:
			var req content.UpdateBannerRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			banner, err := svc.UpdateBanner(r.Context(), id, req)
			if err != nil {
				return httpx.Internal("update failed", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, banner)

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
