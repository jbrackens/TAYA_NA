package compliance

import (
	"encoding/json"
	"errors"
	"io"
	stdhttp "net/http"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/platform/transport/httpx"
)

// RegisterComplianceRoutes registers all compliance-related HTTP handlers
func RegisterComplianceRoutes(
	mux *stdhttp.ServeMux,
	geoService GeoComplianceService,
	kycService KYCService,
	rgService ResponsibleGamblingService,
) {
	registerGeoComplianceRoutes(mux, geoService)
	registerKYCRoutes(mux, kycService)
	registerResponsibleGamblingRoutes(mux, rgService)
}

// Geolocation handlers
func registerGeoComplianceRoutes(mux *stdhttp.ServeMux, service GeoComplianceService) {
	mux.Handle("/api/v1/compliance/geo/verify", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var req struct {
			UserID    string  `json:"userId"`
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		if req.UserID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}

		result, err := service.VerifyLocation(r.Context(), req.UserID, req.Latitude, req.Longitude)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"result": result,
		})
	}))

	mux.Handle("/api/v1/compliance/geo/approved-countries", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		countries, err := service.GetApprovedCountries(r.Context())
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"countries": countries,
			"total":     len(countries),
		})
	}))

	mux.Handle("/api/v1/compliance/geo/check", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		country := r.URL.Query().Get("country")
		state := r.URL.Query().Get("state")
		if country == "" {
			return httpx.BadRequest("country query parameter is required", map[string]any{"field": "country"})
		}

		approved, err := service.IsLocationApproved(r.Context(), country, state)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"country":  country,
			"state":    state,
			"approved": approved,
		})
	}))
}

// KYC handlers
func registerKYCRoutes(mux *stdhttp.ServeMux, service KYCService) {
	mux.Handle("/api/v1/compliance/kyc/verify", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var req struct {
			UserID    string                 `json:"userId"`
			Documents []VerificationDocument `json:"documents"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		if req.UserID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}
		if len(req.Documents) == 0 {
			return httpx.BadRequest("at least one document is required", map[string]any{"field": "documents"})
		}

		uid, err := sessionBoundUserID(r, req.UserID)
		if err != nil {
			return err
		}

		result, err := service.VerifyIdentity(r.Context(), uid, req.Documents)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"result": result,
		})
	}))

	mux.Handle("/api/v1/compliance/kyc/status", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		// D-6 parity / GET-disclosure fix: bind the read to the
		// authenticated session. These reads previously trusted an
		// arbitrary ?userId=, so any authenticated user could read
		// another user's RG/KYC state (deterministic userIDs → trivial
		// enumeration). A mismatched supplied userId is rejected (403);
		// an absent one defaults to the session user.
		userID, err := sessionBoundUserID(r, r.URL.Query().Get("userId"))
		if err != nil {
			return err
		}

		status, err := service.GetVerificationStatus(r.Context(), userID)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"status": kycStatusPayload(status),
		})
	}))

	mux.Handle("/api/v1/compliance/kyc/submit-document", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var req struct {
			UserID         string `json:"userId"`
			Type           string `json:"type"`
			DocumentID     string `json:"documentId"`
			IssuingCountry string `json:"issuingCountry"`
			ExpiryDate     string `json:"expiryDate"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		if req.UserID == "" || req.Type == "" {
			return httpx.BadRequest("userId and type are required", map[string]any{"field": "body"})
		}

		uid, err := sessionBoundUserID(r, req.UserID)
		if err != nil {
			return err
		}

		doc := VerificationDocument{
			UserID:         uid,
			Type:           req.Type,
			DocumentID:     req.DocumentID,
			IssuingCountry: req.IssuingCountry,
			ExpiryDate:     req.ExpiryDate,
		}

		result, err := service.SubmitDocument(r.Context(), uid, doc)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
			"document": result,
		})
	}))

	mux.Handle("/api/v1/compliance/kyc/documents", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		// D-6 parity / GET-disclosure fix: bind the read to the
		// authenticated session. These reads previously trusted an
		// arbitrary ?userId=, so any authenticated user could read
		// another user's RG/KYC state (deterministic userIDs → trivial
		// enumeration). A mismatched supplied userId is rejected (403);
		// an absent one defaults to the session user.
		userID, err := sessionBoundUserID(r, r.URL.Query().Get("userId"))
		if err != nil {
			return err
		}

		documents, err := service.ListDocuments(r.Context(), userID)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"userId":    userID,
			"documents": kycDocumentPayloads(documents),
			"total":     len(documents),
		})
	}))
}

// sessionBoundUserID enforces that a responsible-gambling / KYC operation
// targets the authenticated caller's own account. It returns the session
// userID — which callers MUST use as the target instead of the request
// body or query param. The handlers historically trusted a caller-supplied
// `userId`, so any authenticated user could set another user's limits /
// cool-off / (irreversible) self-exclusion (D-6) — and, via the GET reads,
// read another user's RG/KYC state — by guessing their userID (deterministic
// from username). A non-empty supplied userID that doesn't match the session
// is rejected (defense in depth + surfaces client/integration bugs); an
// unauthenticated context is rejected. (UAT 2026-05-16 D-6; reads hardened
// 2026-05-17 GET-disclosure residual.)
func sessionBoundUserID(r *stdhttp.Request, bodyUserID string) (string, error) {
	sessionUID := httpx.UserIDFromContext(r.Context())
	if sessionUID == "" {
		return "", httpx.Forbidden("authentication required")
	}
	if bodyUserID != "" && bodyUserID != sessionUID {
		return "", httpx.Forbidden("cannot access another user's compliance data")
	}
	return sessionUID, nil
}

type responsibleLimitRequest struct {
	UserID            string `json:"userId"`
	Period            string `json:"period"`
	AmountPointsCents int64  `json:"amountPointsCents"`
	AmountCents       int64  `json:"amountCents"`
}

func decodeResponsibleLimitRequest(body io.Reader, launchRoute bool) (responsibleLimitRequest, error) {
	var raw map[string]json.RawMessage
	if err := json.NewDecoder(body).Decode(&raw); err != nil {
		return responsibleLimitRequest{}, httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
	}
	if launchRoute {
		if _, ok := raw["amountCents"]; ok {
			return responsibleLimitRequest{}, httpx.BadRequest("responsible-play limits require amountPointsCents", map[string]any{"field": "amountPointsCents"})
		}
	}
	data, err := json.Marshal(raw)
	if err != nil {
		return responsibleLimitRequest{}, httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
	}
	var req responsibleLimitRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return responsibleLimitRequest{}, httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
	}
	return req, nil
}

// Responsible Gambling handlers
func registerResponsibleGamblingRoutes(mux *stdhttp.ServeMux, service ResponsibleGamblingService) {
	setPointUseLimitHandler := httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		req, err := decodeResponsibleLimitRequest(r.Body, r.URL.Path == "/api/v1/compliance/rg/point-use-limit")
		if err != nil {
			return err
		}

		amountCents := req.AmountPointsCents
		if amountCents <= 0 {
			amountCents = req.AmountCents
		}

		if req.UserID == "" || req.Period == "" || amountCents <= 0 {
			return httpx.BadRequest("userId, period, and amountPointsCents are required", map[string]any{"field": "body"})
		}

		uid, err := sessionBoundUserID(r, req.UserID)
		if err != nil {
			return err
		}

		if err := service.SetDepositLimit(r.Context(), uid, req.Period, amountCents); err != nil {
			return mapComplianceError(err)
		}

		// Honest response (LC-19/D-11): confirmed effective + pending; never
		// optimistically echo the requested amount as effective (codex
		// D-11 P2).
		resp := map[string]any{
			"userId":                     uid,
			"period":                     req.Period,
			"unit":                       "PTS",
			"requestedPointsCents":       amountCents,
			"requestedAmountCents":       amountCents,
			"requestedAmountPointsCents": amountCents,
		}
		confirmed := false
		if limits, gerr := service.GetDepositLimits(r.Context(), uid); gerr == nil {
			for _, l := range limits {
				if l.Period == req.Period {
					confirmed = true
					resp["amountPointsCents"] = l.LimitCents
					resp["amountCents"] = l.LimitCents
					resp["limitPointsCents"] = l.LimitCents
					resp["remainingPointsCents"] = l.RemainingCents
					resp["usedPointsCents"] = l.UsedCents
					resp["deferred"] = l.PendingLimitCents > 0
					if l.PendingLimitCents > 0 {
						resp["pendingAmountPointsCents"] = l.PendingLimitCents
						resp["pendingAmountCents"] = l.PendingLimitCents
						resp["pendingLimitPointsCents"] = l.PendingLimitCents
						resp["pendingActivatesAt"] = l.PendingActivatesAt
					}
					break
				}
			}
		}
		if !confirmed {
			resp["effectiveState"] = "unknown — re-query /api/v1/compliance/rg/point-use-limits"
		}
		return httpx.WriteJSON(w, stdhttp.StatusCreated, resp)
	})

	listPointUseLimitsHandler := httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		// D-6 parity / GET-disclosure fix: bind the read to the
		// authenticated session. These reads previously trusted an
		// arbitrary ?userId=, so any authenticated user could read
		// another user's RG/KYC state (deterministic userIDs → trivial
		// enumeration). A mismatched supplied userId is rejected (403);
		// an absent one defaults to the session user.
		userID, err := sessionBoundUserID(r, r.URL.Query().Get("userId"))
		if err != nil {
			return err
		}

		limits, err := service.GetDepositLimits(r.Context(), userID)
		if err != nil {
			return mapComplianceError(err)
		}

		pointLimits := make([]map[string]any, 0, len(limits))
		for _, limit := range limits {
			pointLimits = append(pointLimits, pointUseLimitResponse(limit))
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"userId": userID,
			"unit":   "PTS",
			"limits": pointLimits,
			"total":  len(limits),
		})
	})

	mux.Handle("/api/v1/compliance/rg/point-use-limit", setPointUseLimitHandler)
	mux.Handle("/api/v1/compliance/rg/point-use-limits", listPointUseLimitsHandler)
	mux.Handle("/api/v1/compliance/rg/deposit-limit", setPointUseLimitHandler)
	mux.Handle("/api/v1/compliance/rg/deposit-limits", listPointUseLimitsHandler)

	setPredictionLimitHandler := httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		req, err := decodeResponsibleLimitRequest(r.Body, r.URL.Path == "/api/v1/compliance/rg/prediction-limit")
		if err != nil {
			return err
		}

		amountCents := req.AmountPointsCents
		if amountCents <= 0 {
			amountCents = req.AmountCents
		}

		if req.UserID == "" || req.Period == "" || amountCents <= 0 {
			return httpx.BadRequest("userId, period, and amountPointsCents are required", map[string]any{"field": "body"})
		}

		uid, err := sessionBoundUserID(r, req.UserID)
		if err != nil {
			return err
		}

		if err := service.SetBetLimit(r.Context(), uid, req.Period, amountCents); err != nil {
			return mapComplianceError(err)
		}

		// Honest response (LC-19/D-11): a loosening is deferred behind a
		// cooldown, so report the *confirmed effective* limit + any pending
		// change. Never optimistically echo the requested amount as
		// effective — if the read-back can't confirm it, say so (codex
		// D-11 P2) rather than implying the looser limit is live.
		resp := map[string]any{
			"userId":                     uid,
			"period":                     req.Period,
			"unit":                       "PTS",
			"requestedPointsCents":       amountCents,
			"requestedAmountCents":       amountCents,
			"requestedAmountPointsCents": amountCents,
		}
		confirmed := false
		if limits, gerr := service.GetBetLimits(r.Context(), uid); gerr == nil {
			for _, l := range limits {
				if l.Period == req.Period {
					confirmed = true
					resp["amountPointsCents"] = l.LimitCents
					resp["amountCents"] = l.LimitCents
					resp["limitPointsCents"] = l.LimitCents
					resp["remainingPointsCents"] = l.RemainingCents
					resp["usedPointsCents"] = l.UsedCents
					resp["deferred"] = l.PendingLimitCents > 0
					if l.PendingLimitCents > 0 {
						resp["pendingAmountPointsCents"] = l.PendingLimitCents
						resp["pendingAmountCents"] = l.PendingLimitCents
						resp["pendingLimitPointsCents"] = l.PendingLimitCents
						resp["pendingActivatesAt"] = l.PendingActivatesAt
					}
					break
				}
			}
		}
		if !confirmed {
			resp["effectiveState"] = "unknown — re-query /api/v1/compliance/rg/prediction-limits"
		}
		return httpx.WriteJSON(w, stdhttp.StatusCreated, resp)
	})

	listPredictionLimitsHandler := httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		// D-6 parity / GET-disclosure fix: bind the read to the
		// authenticated session. These reads previously trusted an
		// arbitrary ?userId=, so any authenticated user could read
		// another user's RG/KYC state (deterministic userIDs → trivial
		// enumeration). A mismatched supplied userId is rejected (403);
		// an absent one defaults to the session user.
		userID, err := sessionBoundUserID(r, r.URL.Query().Get("userId"))
		if err != nil {
			return err
		}

		limits, err := service.GetBetLimits(r.Context(), userID)
		if err != nil {
			return mapComplianceError(err)
		}

		predictionLimits := make([]map[string]any, 0, len(limits))
		for _, limit := range limits {
			predictionLimits = append(predictionLimits, predictionLimitResponse(limit))
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"userId": userID,
			"unit":   "PTS",
			"limits": predictionLimits,
			"total":  len(limits),
		})
	})

	mux.Handle("/api/v1/compliance/rg/prediction-limit", setPredictionLimitHandler)
	mux.Handle("/api/v1/compliance/rg/prediction-limits", listPredictionLimitsHandler)
	mux.Handle("/api/v1/compliance/rg/bet-limit", setPredictionLimitHandler)
	mux.Handle("/api/v1/compliance/rg/bet-limits", listPredictionLimitsHandler)

	checkPointUseHandler := httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		// GET-disclosure fix: bind to the authenticated session (see
		// the read handlers above) so a caller cannot probe another
		// user's deposit-limit state via ?userId=.
		userID, err := sessionBoundUserID(r, r.URL.Query().Get("userId"))
		if err != nil {
			return err
		}
		launchRoute := r.URL.Path == "/api/v1/compliance/rg/check-point-use"
		if launchRoute && r.URL.Query().Has("amountCents") {
			return httpx.BadRequest("check-point-use requires amountPointsCents", map[string]any{"field": "amountPointsCents"})
		}
		amountStr := r.URL.Query().Get("amountPointsCents")
		if amountStr == "" {
			amountStr = r.URL.Query().Get("amountCents")
		}
		if amountStr == "" {
			return httpx.BadRequest("amountPointsCents query parameter is required", map[string]any{"field": "amountPointsCents"})
		}

		amountCents, err := strconv.ParseInt(amountStr, 10, 64)
		if err != nil || amountCents <= 0 {
			return httpx.BadRequest("amountPointsCents must be a positive integer", map[string]any{"field": "amountPointsCents"})
		}

		allowed, reason, err := service.CheckDepositAllowed(r.Context(), userID, amountCents)
		if err != nil && !errors.Is(err, ErrDepositLimitExceeded) && !errors.Is(err, ErrUserExcluded) && !errors.Is(err, ErrUserBlocked) {
			return mapComplianceError(err)
		}

		resp := map[string]any{
			"userId":            userID,
			"unit":              "PTS",
			"amountPointsCents": amountCents,
			"amountCents":       amountCents,
			"allowed":           allowed,
			"reason":            pointUseCheckReason(reason, err),
		}
		if errors.Is(err, ErrDepositLimitExceeded) {
			resp["reasonCode"] = "point_use_limit_exceeded"
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, resp)
	})

	checkPredictionHandler := httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		// GET-disclosure fix: bind to the authenticated session (see
		// the read handlers above) so a caller cannot probe another
		// user's bet-limit / exclusion state via ?userId=.
		userID, err := sessionBoundUserID(r, r.URL.Query().Get("userId"))
		if err != nil {
			return err
		}
		launchRoute := r.URL.Path == "/api/v1/compliance/rg/check-prediction"
		if launchRoute && (r.URL.Query().Has("stakePointsCents") || r.URL.Query().Has("stakeCents")) {
			return httpx.BadRequest("check-prediction requires amountPointsCents", map[string]any{"field": "amountPointsCents"})
		}
		predictionAmountStr := r.URL.Query().Get("amountPointsCents")
		if predictionAmountStr == "" {
			predictionAmountStr = r.URL.Query().Get("stakePointsCents")
		}
		if predictionAmountStr == "" {
			predictionAmountStr = r.URL.Query().Get("stakeCents")
		}
		if predictionAmountStr == "" {
			return httpx.BadRequest("amountPointsCents query parameter is required", map[string]any{"field": "amountPointsCents"})
		}

		predictionAmountCents, err := strconv.ParseInt(predictionAmountStr, 10, 64)
		if err != nil || predictionAmountCents <= 0 {
			return httpx.BadRequest("amountPointsCents must be a positive integer", map[string]any{"field": "amountPointsCents"})
		}

		allowed, reason, err := service.CheckBetAllowed(r.Context(), userID, predictionAmountCents)
		if err != nil && !errors.Is(err, ErrBetLimitExceeded) && !errors.Is(err, ErrUserExcluded) && !errors.Is(err, ErrUserBlocked) {
			return mapComplianceError(err)
		}

		resp := map[string]any{
			"userId":            userID,
			"unit":              "PTS",
			"amountPointsCents": predictionAmountCents,
			"allowed":           allowed,
			"reason":            predictionCheckReason(reason, err),
		}
		if errors.Is(err, ErrBetLimitExceeded) {
			resp["reasonCode"] = "prediction_limit_exceeded"
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, resp)
	})

	mux.Handle("/api/v1/compliance/rg/check-point-use", checkPointUseHandler)
	mux.Handle("/api/v1/compliance/rg/check-deposit", checkPointUseHandler)
	mux.Handle("/api/v1/compliance/rg/check-prediction", checkPredictionHandler)
	mux.Handle("/api/v1/compliance/rg/check-bet", checkPredictionHandler)

	// Session limits — restrict how long a user can play per session
	mux.Handle("/api/v1/compliance/rg/session-limit", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var req struct {
			UserID                 string `json:"user_id"`
			SessionDurationMinutes int    `json:"session_duration_minutes"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}
		if req.UserID == "" || req.SessionDurationMinutes <= 0 {
			return httpx.BadRequest("user_id and session_duration_minutes are required", nil)
		}

		uid, err := sessionBoundUserID(r, req.UserID)
		if err != nil {
			return err
		}

		return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
			"user_id":                  uid,
			"session_duration_minutes": req.SessionDurationMinutes,
			"effective_date":           time.Now().UTC().Format(time.RFC3339),
			"created_at":               time.Now().UTC().Format(time.RFC3339),
		})
	}))

	mux.Handle("/api/v1/compliance/rg/cool-off", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var req struct {
			UserID        string `json:"userId"`
			UserIDSnake   string `json:"user_id"`
			DurationHours int    `json:"durationHours"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		if req.UserID == "" {
			req.UserID = req.UserIDSnake
		}
		if req.UserID == "" || req.DurationHours <= 0 {
			return httpx.BadRequest("userId and durationHours are required", map[string]any{"field": "body"})
		}

		uid, err := sessionBoundUserID(r, req.UserID)
		if err != nil {
			return err
		}

		if err := service.SetCoolOff(r.Context(), uid, req.DurationHours); err != nil {
			return mapComplianceError(err)
		}

		now := time.Now().UTC()
		return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
			"userId":       uid,
			"status":       "active",
			"coolOffUntil": now.Add(time.Duration(req.DurationHours) * time.Hour).Format(time.RFC3339),
			"createdAt":    now.Format(time.RFC3339),
		})
	}))

	mux.Handle("/api/v1/compliance/rg/self-exclude", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var req struct {
			UserID      string `json:"userId"`
			UserIDSnake string `json:"user_id"`
			Permanent   bool   `json:"permanent"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		if req.UserID == "" {
			req.UserID = req.UserIDSnake
		}
		if req.UserID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}

		uid, err := sessionBoundUserID(r, req.UserID)
		if err != nil {
			return err
		}

		if err := service.SetSelfExclusion(r.Context(), uid, req.Permanent); err != nil {
			return mapComplianceError(err)
		}

		now := time.Now().UTC()
		excludedUntil := now.AddDate(0, 0, 30).Format(time.RFC3339)
		status := "temporary"
		if req.Permanent {
			status = "permanent"
			excludedUntil = time.Date(9999, time.December, 31, 0, 0, 0, 0, time.UTC).Format(time.RFC3339)
		}

		return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
			"userId":        uid,
			"status":        status,
			"excludedUntil": excludedUntil,
			"createdAt":     now.Format(time.RFC3339),
		})
	}))

	mux.Handle("/api/v1/compliance/rg/restrictions", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		// D-6 parity / GET-disclosure fix: bind the read to the
		// authenticated session. These reads previously trusted an
		// arbitrary ?userId=, so any authenticated user could read
		// another user's RG/KYC state (deterministic userIDs → trivial
		// enumeration). A mismatched supplied userId is rejected (403);
		// an absent one defaults to the session user.
		userID, err := sessionBoundUserID(r, r.URL.Query().Get("userId"))
		if err != nil {
			return err
		}

		restrictions, err := service.GetPlayerRestrictions(r.Context(), userID)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"restrictions": restrictionsResponse(restrictions),
		})
	}))
}

func pointUseLimitResponse(limit DepositLimit) map[string]any {
	resp := map[string]any{
		"userId":                  limit.UserID,
		"period":                  limit.Period,
		"unit":                    "PTS",
		"limitPointsCents":        limit.LimitCents,
		"remainingPointsCents":    limit.RemainingCents,
		"usedPointsCents":         limit.UsedCents,
		"limitCents":              limit.LimitCents,
		"remainingCents":          limit.RemainingCents,
		"usedCents":               limit.UsedCents,
		"resetsAt":                limit.ResetsAt,
		"createdAt":               limit.CreatedAt,
		"pendingActivatesAt":      limit.PendingActivatesAt,
		"pendingLimitCents":       limit.PendingLimitCents,
		"pendingLimitPointsCents": limit.PendingLimitCents,
	}
	if limit.PendingLimitCents == 0 {
		delete(resp, "pendingLimitCents")
		delete(resp, "pendingLimitPointsCents")
	}
	if limit.PendingActivatesAt == "" {
		delete(resp, "pendingActivatesAt")
	}
	return resp
}

func predictionLimitResponse(limit BetLimit) map[string]any {
	resp := map[string]any{
		"userId":                  limit.UserID,
		"period":                  limit.Period,
		"unit":                    "PTS",
		"limitPointsCents":        limit.LimitCents,
		"remainingPointsCents":    limit.RemainingCents,
		"usedPointsCents":         limit.UsedCents,
		"limitCents":              limit.LimitCents,
		"remainingCents":          limit.RemainingCents,
		"usedCents":               limit.UsedCents,
		"resetsAt":                limit.ResetsAt,
		"createdAt":               limit.CreatedAt,
		"pendingActivatesAt":      limit.PendingActivatesAt,
		"pendingLimitCents":       limit.PendingLimitCents,
		"pendingLimitPointsCents": limit.PendingLimitCents,
	}
	if limit.PendingLimitCents == 0 {
		delete(resp, "pendingLimitCents")
		delete(resp, "pendingLimitPointsCents")
	}
	if limit.PendingActivatesAt == "" {
		delete(resp, "pendingActivatesAt")
	}
	return resp
}

func restrictionsResponse(restrictions *PlayerRestrictions) map[string]any {
	pointUseLimits := make([]map[string]any, 0, len(restrictions.DepositLimits))
	for _, limit := range restrictions.DepositLimits {
		pointUseLimits = append(pointUseLimits, pointUseLimitResponse(limit))
	}

	predictionLimits := make([]map[string]any, 0, len(restrictions.BetLimits))
	for _, limit := range restrictions.BetLimits {
		predictionLimits = append(predictionLimits, predictionLimitResponse(limit))
	}

	return map[string]any{
		"userId":           restrictions.UserID,
		"unit":             "PTS",
		"isBlocked":        restrictions.IsBlocked,
		"isOnCoolOff":      restrictions.IsOnCoolOff,
		"coolOffUntil":     restrictions.CoolOffUntil,
		"isExcluded":       restrictions.IsExcluded,
		"exclusionType":    restrictions.ExclusionType,
		"excludedUntil":    restrictions.ExcludedUntil,
		"pointUseLimits":   pointUseLimits,
		"predictionLimits": predictionLimits,
		"depositLimits":    restrictions.DepositLimits,
		"betLimits":        restrictions.BetLimits,
		"lastUpdated":      restrictions.LastUpdated,
	}
}

func pointUseCheckReason(reason string, err error) string {
	if errors.Is(err, ErrDepositLimitExceeded) {
		return strings.Replace(reason, "Deposit limit", "Point-use limit", 1)
	}
	return reason
}

func predictionCheckReason(reason string, err error) string {
	if errors.Is(err, ErrBetLimitExceeded) {
		return strings.Replace(reason, "Bet limit", "Prediction limit", 1)
	}
	return reason
}

func mapComplianceError(err error) error {
	if errors.Is(err, ErrInvalidUserID) {
		return httpx.BadRequest("invalid user id", map[string]any{"field": "userId"})
	}
	if errors.Is(err, ErrInvalidLocation) {
		return httpx.BadRequest("invalid location coordinates", map[string]any{"field": "location"})
	}
	if errors.Is(err, ErrRestrictedLocation) {
		return httpx.Forbidden("gaming not available in this location")
	}
	if errors.Is(err, ErrInvalidDocument) {
		return httpx.BadRequest("invalid document", map[string]any{"field": "document"})
	}
	if errors.Is(err, ErrUserNotVerified) {
		return httpx.Forbidden("user identity not verified")
	}
	if errors.Is(err, ErrInvalidLimitPeriod) {
		return httpx.BadRequest("invalid limit period", map[string]any{"field": "period"})
	}
	if errors.Is(err, ErrDepositLimitExceeded) {
		return httpx.Forbidden("point-use limit exceeded")
	}
	if errors.Is(err, ErrBetLimitExceeded) {
		return httpx.Forbidden("prediction limit exceeded")
	}
	if errors.Is(err, ErrUserBlocked) {
		return httpx.Forbidden("user account is blocked")
	}
	if errors.Is(err, ErrUserExcluded) {
		return httpx.Forbidden("user is self-excluded")
	}
	return httpx.Internal("compliance check failed", err)
}
