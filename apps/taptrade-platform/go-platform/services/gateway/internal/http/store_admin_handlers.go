package http

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"strings"
	"time"

	"taptrade/gateway/internal/compliance"
	"taptrade/gateway/internal/store"
	"taptrade/platform/transport/httpx"
)

// Point-store catalogue administration (owner decision 2026-07-12, item 3).
//
// Registered ONLY when STORE_ENABLED=true, alongside the player store tree.
// RBAC reuses the existing finance permissions (no new permission rows):
// finances:view reads the catalogue, finances:write mutates it. Every
// mutation is provider-ops audit-logged. Purchases are never touched here —
// they carry immutable snapshots, so catalogue edits only affect future
// checkouts.

type adminPackRequest struct {
	Name          string     `json:"name"`
	PriceUsdCents int64      `json:"priceUsdCents"`
	BasePoints    int64      `json:"basePoints"`
	BonusPoints   int64      `json:"bonusPoints"`
	DisplayOrder  int        `json:"displayOrder"`
	Active        bool       `json:"active"`
	Badge         string     `json:"badge"`
	IntroOnly     bool       `json:"introOnly"`
	PromoStartsAt *time.Time `json:"promoStartsAt"`
	PromoEndsAt   *time.Time `json:"promoEndsAt"`
	StripePriceID string     `json:"stripePriceId"`
}

func (req adminPackRequest) toPack(id string) store.PointPack {
	return store.PointPack{
		ID:            id,
		Name:          strings.TrimSpace(req.Name),
		PriceUsdCents: req.PriceUsdCents,
		BasePoints:    req.BasePoints,
		BonusPoints:   req.BonusPoints,
		DisplayOrder:  req.DisplayOrder,
		Active:        req.Active,
		Badge:         strings.TrimSpace(req.Badge),
		IntroOnly:     req.IntroOnly,
		PromoStartsAt: req.PromoStartsAt,
		PromoEndsAt:   req.PromoEndsAt,
		StripePriceID: strings.TrimSpace(req.StripePriceID),
	}
}

func adminPackPayload(pack store.PointPack) map[string]any {
	return map[string]any{
		"id":            pack.ID,
		"name":          pack.Name,
		"priceUsdCents": pack.PriceUsdCents,
		"basePoints":    pack.BasePoints,
		"bonusPoints":   pack.BonusPoints,
		"totalPoints":   pack.TotalPoints(),
		"displayOrder":  pack.DisplayOrder,
		"active":        pack.Active,
		"badge":         pack.Badge,
		"introOnly":     pack.IntroOnly,
		"promoStartsAt": pack.PromoStartsAt,
		"promoEndsAt":   pack.PromoEndsAt,
		"stripePriceId": pack.StripePriceID,
		"unit":          "PTS",
	}
}

func registerStoreAdminRoutes(mux *stdhttp.ServeMux, repo store.Repository) {
	copyCheck := store.LaunchCopyChecker(compliance.HasLaunchProhibitedCopy)

	mux.Handle("/api/v1/admin/store/packs", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireAdminPermission(r, "finances:view"); err != nil {
				return err
			}
			packs, err := repo.ListPacks(r.Context())
			if err != nil {
				return httpx.Internal("catalogue read failed", err)
			}
			items := make([]map[string]any, 0, len(packs))
			for _, pack := range packs {
				items = append(items, adminPackPayload(pack))
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"items": items,
				"total": len(items),
			})

		case stdhttp.MethodPost:
			if err := requireAdminPermission(r, "finances:write"); err != nil {
				return err
			}
			var body struct {
				ID string `json:"id"`
				adminPackRequest
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			pack := body.adminPackRequest.toPack(strings.TrimSpace(body.ID))
			if err := store.ValidatePackConfig(pack, copyCheck); err != nil {
				return mapPackConfigError(err)
			}
			if existing, err := repo.GetPack(r.Context(), pack.ID); err != nil {
				return httpx.Internal("catalogue read failed", err)
			} else if existing != nil {
				return httpx.Conflict("a pack with this id already exists", map[string]any{"field": "id"})
			}
			if err := repo.UpsertPack(r.Context(), pack); err != nil {
				return httpx.Internal("catalogue write failed", err)
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "store.pack_created", pack.ID, map[string]any{
				"priceUsdCents": pack.PriceUsdCents,
				"basePoints":    pack.BasePoints,
				"bonusPoints":   pack.BonusPoints,
				"active":        pack.Active,
				"unit":          "PTS",
			})
			return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{"pack": adminPackPayload(pack)})

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	mux.Handle("/api/v1/admin/store/packs/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPut {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPut)
		}
		if err := requireAdminPermission(r, "finances:write"); err != nil {
			return err
		}
		id := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/v1/admin/store/packs/"))
		if id == "" || strings.Contains(id, "/") {
			return httpx.NotFound("point pack not found")
		}
		existing, err := repo.GetPack(r.Context(), id)
		if err != nil {
			return httpx.Internal("catalogue read failed", err)
		}
		if existing == nil {
			return httpx.NotFound("point pack not found")
		}
		var body adminPackRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}
		pack := body.toPack(id)
		if err := store.ValidatePackConfig(pack, copyCheck); err != nil {
			return mapPackConfigError(err)
		}
		if err := repo.UpsertPack(r.Context(), pack); err != nil {
			return httpx.Internal("catalogue write failed", err)
		}
		recordProviderOpsAuditAction(userIDFromRequest(r), "store.pack_updated", pack.ID, map[string]any{
			"priceUsdCents": pack.PriceUsdCents,
			"basePoints":    pack.BasePoints,
			"bonusPoints":   pack.BonusPoints,
			"active":        pack.Active,
			"unit":          "PTS",
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"pack": adminPackPayload(pack)})
	}))
}

func mapPackConfigError(err error) error {
	if errors.Is(err, store.ErrPackConfigInvalid) {
		return httpx.BadRequest(err.Error(), nil)
	}
	return httpx.Internal("pack validation failed", err)
}
