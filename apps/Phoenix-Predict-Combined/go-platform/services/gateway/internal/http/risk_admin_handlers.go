package http

import (
	"context"
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/gateway/internal/risk"
	"phoenix-revival/platform/transport/httpx"
)

// amlPointsReader / screeningReader are the read-only signal sources the risk
// FactorSource aggregates. *aml.Store and *compliance.PostgresKYCService
// satisfy them; both are consumer-side interfaces so the wiring can pass nil
// (screening absent) and tests can fake them.
type amlPointsReader interface {
	OpenAlertRiskPoints(ctx context.Context, subjectID string) (int, error)
}
type screeningReader interface {
	GetIdentity(ctx context.Context, userID string) (*compliance.KYCIdentity, error)
}

// riskFactorSource is the concrete risk.FactorSource: a customer's AML
// open-alert risk points plus their sanctions/PEP screening verdict. Reads are
// READ-ONLY over the AML and KYC stores; a missing identity is a neutral
// (unscreened) signal, but an infra error fails the recompute honestly rather
// than silently rating the customer clean.
type riskFactorSource struct {
	aml amlPointsReader
	kyc screeningReader
}

func newRiskFactorSource(amlR amlPointsReader, kyc screeningReader) *riskFactorSource {
	return &riskFactorSource{aml: amlR, kyc: kyc}
}

func (s *riskFactorSource) Gather(ctx context.Context, subjectID string) (risk.Factors, error) {
	pts, err := s.aml.OpenAlertRiskPoints(ctx, subjectID)
	if err != nil {
		return risk.Factors{}, err
	}
	status := ""
	if s.kyc != nil {
		id, err := s.kyc.GetIdentity(ctx, subjectID)
		if err != nil {
			return risk.Factors{}, err
		}
		if id != nil {
			status = id.ScreeningStatus
		}
	}
	return risk.Factors{AMLOpenAlertPoints: pts, ScreeningStatus: status}, nil
}

// riskAdminStore / riskRecomputer are the consumer-side interfaces the routes
// need — *risk.Store and *risk.Engine satisfy them; the tests stub them.
type riskAdminStore interface {
	Get(ctx context.Context, subjectID string) (*risk.Rating, error)
	List(ctx context.Context, tier string, limit, offset int) ([]risk.Rating, error)
	SetOverride(ctx context.Context, subjectID string, tier risk.Tier, by, reason string) error
	ClearOverride(ctx context.Context, subjectID string) error
}
type riskRecomputer interface {
	Recompute(ctx context.Context, subjectID string) (*risk.Rating, error)
}

func mapRiskError(err error) error {
	switch {
	case errors.Is(err, risk.ErrNotFound):
		return httpx.NotFound("no risk rating for this subject")
	case errors.Is(err, risk.ErrInvalidInput):
		return httpx.BadRequest("invalid input", nil)
	default:
		return httpx.Internal("risk operation failed", err)
	}
}

// ratingEnvelope wraps a rating with its effective tier (a method, so not
// serialized by default) — the value gating and the office consult.
func ratingEnvelope(r *risk.Rating) map[string]any {
	return map[string]any{"rating": r, "effectiveTier": r.EffectiveTier()}
}

// registerRiskAdminRoutes wires the per-customer risk-rating back office (PAM
// spec §12 KYC, AML, Risk, and Compliance — GAP-12). Reads are compliance:read;
// mutations are compliance:write and audited.
//
//	GET    /api/v1/admin/risk/ratings?tier=&limit=&offset=      (compliance:read)
//	GET    /api/v1/admin/risk/ratings/{subject}                 (compliance:read)
//	POST   /api/v1/admin/risk/ratings/{subject}/recompute       (compliance:write) — risk.rating_recomputed
//	POST   /api/v1/admin/risk/ratings/{subject}/override {tier,reason} (compliance:write) — risk.rating_overridden
//	DELETE /api/v1/admin/risk/ratings/{subject}/override        (compliance:write) — risk.rating_override_cleared
func registerRiskAdminRoutes(mux *stdhttp.ServeMux, store riskAdminStore, engine riskRecomputer) {
	mux.Handle("/api/v1/admin/risk/ratings", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminPermission(r, "compliance:read"); err != nil {
			return err
		}
		q := r.URL.Query()
		limit, _ := strconv.Atoi(q.Get("limit"))
		offset, _ := strconv.Atoi(q.Get("offset"))
		ratings, err := store.List(r.Context(), q.Get("tier"), limit, offset)
		if err != nil {
			return httpx.Internal("failed to list risk ratings", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"ratings": ratings, "total": len(ratings)})
	}))

	mux.Handle("/api/v1/admin/risk/ratings/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		rest := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/risk/ratings/")
		parts := strings.SplitN(strings.Trim(rest, "/"), "/", 2)
		subjectID := parts[0]
		action := ""
		if len(parts) > 1 {
			action = parts[1]
		}
		if subjectID == "" {
			return httpx.NotFound("subject id is required")
		}

		switch action {
		case "":
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			if err := requireAdminPermission(r, "compliance:read"); err != nil {
				return err
			}
			rating, err := store.Get(r.Context(), subjectID)
			if err != nil {
				return mapRiskError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, ratingEnvelope(rating))

		case "recompute":
			if r.Method != stdhttp.MethodPost {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
			}
			if err := requireAdminPermission(r, "compliance:write"); err != nil {
				return err
			}
			rating, err := engine.Recompute(r.Context(), subjectID)
			if err != nil {
				return mapRiskError(err)
			}
			recordProviderOpsAuditAction(userIDFromRequest(r), "risk.rating_recomputed", subjectID,
				map[string]any{"tier": string(rating.Tier), "score": rating.Score, "effectiveTier": string(rating.EffectiveTier())})
			return httpx.WriteJSON(w, stdhttp.StatusOK, ratingEnvelope(rating))

		case "override":
			if err := requireAdminPermission(r, "compliance:write"); err != nil {
				return err
			}
			switch r.Method {
			case stdhttp.MethodPost:
				var body struct {
					Tier   string `json:"tier"`
					Reason string `json:"reason"`
				}
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					return httpx.BadRequest("invalid request body", nil)
				}
				tier := risk.Tier(strings.TrimSpace(body.Tier))
				if !risk.ValidTier(tier) {
					return httpx.BadRequest("tier must be one of low, medium, high, prohibited", map[string]any{"field": "tier"})
				}
				if strings.TrimSpace(body.Reason) == "" {
					return httpx.BadRequest("a reason is required to override a risk rating", map[string]any{"field": "reason"})
				}
				if err := store.SetOverride(r.Context(), subjectID, tier, userIDFromRequest(r), body.Reason); err != nil {
					return mapRiskError(err)
				}
				recordProviderOpsAuditAction(userIDFromRequest(r), "risk.rating_overridden", subjectID,
					map[string]any{"tier": string(tier), "reason": strings.TrimSpace(body.Reason)})
			case stdhttp.MethodDelete:
				if err := store.ClearOverride(r.Context(), subjectID); err != nil {
					return mapRiskError(err)
				}
				recordProviderOpsAuditAction(userIDFromRequest(r), "risk.rating_override_cleared", subjectID, nil)
			default:
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost, stdhttp.MethodDelete)
			}
			rating, err := store.Get(r.Context(), subjectID)
			if err != nil {
				return mapRiskError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, ratingEnvelope(rating))

		default:
			return httpx.NotFound("unknown risk path")
		}
	}))
}
