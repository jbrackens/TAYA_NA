package http

import (
	"database/sql"
	stdhttp "net/http"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/discover"
	"phoenix-revival/platform/transport/httpx"
)

// registerDiscoverRoutes mounts GET /api/v1/discover. Phase-1 product feed:
// catalog of markets sorted by volume desc, paginated by opaque cursor, with
// optional ?q= title search.
//
// Response shape contract (strict — no extra fields):
//
//	{
//	  "markets": [
//	    {
//	      "id":          "<our uuid>",
//	      "title":       "...",
//	      "description": "...",
//	      "image_url":   "<our path or null>",
//	      "end_time":    "2026-...",
//	      "volume":      12345.67,
//	      "outcomes":    ["Yes","No"],
//	      "prices":      [0.42, 0.58]
//	    }
//	  ],
//	  "next_cursor": "..."
//	}
//
// Nothing about the source venue is exposed. Errors return generic "internal_error".
func registerDiscoverRoutes(mux *stdhttp.ServeMux, db *sql.DB) {
	if db == nil {
		return
	}
	repo := discover.NewRepository(db)

	mux.Handle("/api/v1/discover", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		q := r.URL.Query().Get("q")
		cursor := r.URL.Query().Get("cursor")
		limit := 50
		if v := strings.TrimSpace(r.URL.Query().Get("limit")); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
				limit = n
			}
		}

		rows, next, err := repo.List(r.Context(), q, limit, cursor)
		if err != nil {
			// Generic error — never leak fetcher / source identity.
			return httpx.Internal("failed to load feed", err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"markets":     toDiscoverDTO(rows),
			"next_cursor": next,
		})
	}))
}

// discoverDTO is the strict response shape. Defined as a local type rather
// than a map so JSON ordering is deterministic and `json:"-"` keeps any
// internal fields off the wire if they ever creep in.
type discoverDTO struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	ImageURL    *string    `json:"image_url"`
	EndTime     *time.Time `json:"end_time"`
	Volume      float64    `json:"volume"`
	Outcomes    []string   `json:"outcomes"`
	Prices      []float64  `json:"prices"`
}

func toDiscoverDTO(rows []discover.Row) []discoverDTO {
	out := make([]discoverDTO, 0, len(rows))
	for _, r := range rows {
		dto := discoverDTO{
			ID:          r.ID,
			Title:       r.Title,
			Description: r.Description,
			ImageURL:    r.ImagePath,
			EndTime:     r.EndTime,
			Volume:      r.Volume,
			Outcomes:    r.Outcomes,
			Prices:      r.Prices,
		}
		if dto.Outcomes == nil {
			dto.Outcomes = []string{}
		}
		if dto.Prices == nil {
			dto.Prices = []float64{}
		}
		out = append(out, dto)
	}
	return out
}
