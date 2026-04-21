package compliance

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"strconv"
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

		result, err := service.VerifyIdentity(r.Context(), req.UserID, req.Documents)
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

		userID := r.URL.Query().Get("userId")
		if userID == "" {
			return httpx.BadRequest("userId query parameter is required", map[string]any{"field": "userId"})
		}

		status, err := service.GetVerificationStatus(r.Context(), userID)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"status": status,
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

		doc := VerificationDocument{
			UserID:         req.UserID,
			Type:           req.Type,
			DocumentID:     req.DocumentID,
			IssuingCountry: req.IssuingCountry,
			ExpiryDate:     req.ExpiryDate,
		}

		result, err := service.SubmitDocument(r.Context(), req.UserID, doc)
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

		userID := r.URL.Query().Get("userId")
		if userID == "" {
			return httpx.BadRequest("userId query parameter is required", map[string]any{"field": "userId"})
		}

		documents, err := service.ListDocuments(r.Context(), userID)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"userId":    userID,
			"documents": documents,
			"total":     len(documents),
		})
	}))
}

// Responsible Gambling handlers
func registerResponsibleGamblingRoutes(mux *stdhttp.ServeMux, service ResponsibleGamblingService) {
	mux.Handle("/api/v1/compliance/rg/deposit-limit", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var req struct {
			UserID      string `json:"userId"`
			Period      string `json:"period"`
			AmountCents int64  `json:"amountCents"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		if req.UserID == "" || req.Period == "" || req.AmountCents <= 0 {
			return httpx.BadRequest("userId, period, and amountCents are required", map[string]any{"field": "body"})
		}

		err := service.SetDepositLimit(r.Context(), req.UserID, req.Period, req.AmountCents)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
			"userId":      req.UserID,
			"period":      req.Period,
			"amountCents": req.AmountCents,
		})
	}))

	mux.Handle("/api/v1/compliance/rg/deposit-limits", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		userID := r.URL.Query().Get("userId")
		if userID == "" {
			return httpx.BadRequest("userId query parameter is required", map[string]any{"field": "userId"})
		}

		limits, err := service.GetDepositLimits(r.Context(), userID)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"userId": userID,
			"limits": limits,
			"total":  len(limits),
		})
	}))

	mux.Handle("/api/v1/compliance/rg/bet-limit", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var req struct {
			UserID      string `json:"userId"`
			Period      string `json:"period"`
			AmountCents int64  `json:"amountCents"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		if req.UserID == "" || req.Period == "" || req.AmountCents <= 0 {
			return httpx.BadRequest("userId, period, and amountCents are required", map[string]any{"field": "body"})
		}

		err := service.SetBetLimit(r.Context(), req.UserID, req.Period, req.AmountCents)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
			"userId":      req.UserID,
			"period":      req.Period,
			"amountCents": req.AmountCents,
		})
	}))

	mux.Handle("/api/v1/compliance/rg/bet-limits", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		userID := r.URL.Query().Get("userId")
		if userID == "" {
			return httpx.BadRequest("userId query parameter is required", map[string]any{"field": "userId"})
		}

		limits, err := service.GetBetLimits(r.Context(), userID)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"userId": userID,
			"limits": limits,
			"total":  len(limits),
		})
	}))

	mux.Handle("/api/v1/compliance/rg/check-deposit", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		userID := r.URL.Query().Get("userId")
		amountStr := r.URL.Query().Get("amountCents")
		if userID == "" || amountStr == "" {
			return httpx.BadRequest("userId and amountCents query parameters are required", map[string]any{"field": "query"})
		}

		amountCents, err := strconv.ParseInt(amountStr, 10, 64)
		if err != nil || amountCents <= 0 {
			return httpx.BadRequest("amountCents must be a positive integer", map[string]any{"field": "amountCents"})
		}

		allowed, reason, err := service.CheckDepositAllowed(r.Context(), userID, amountCents)
		if err != nil && !errors.Is(err, ErrDepositLimitExceeded) && !errors.Is(err, ErrUserExcluded) && !errors.Is(err, ErrUserBlocked) {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"userId":      userID,
			"amountCents": amountCents,
			"allowed":     allowed,
			"reason":      reason,
		})
	}))

	mux.Handle("/api/v1/compliance/rg/check-bet", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		userID := r.URL.Query().Get("userId")
		stakeStr := r.URL.Query().Get("stakeCents")
		if userID == "" || stakeStr == "" {
			return httpx.BadRequest("userId and stakeCents query parameters are required", map[string]any{"field": "query"})
		}

		stakeCents, err := strconv.ParseInt(stakeStr, 10, 64)
		if err != nil || stakeCents <= 0 {
			return httpx.BadRequest("stakeCents must be a positive integer", map[string]any{"field": "stakeCents"})
		}

		allowed, reason, err := service.CheckBetAllowed(r.Context(), userID, stakeCents)
		if err != nil && !errors.Is(err, ErrBetLimitExceeded) && !errors.Is(err, ErrUserExcluded) && !errors.Is(err, ErrUserBlocked) {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"userId":     userID,
			"stakeCents": stakeCents,
			"allowed":    allowed,
			"reason":     reason,
		})
	}))

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

		return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
			"user_id":                  req.UserID,
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

		err := service.SetCoolOff(r.Context(), req.UserID, req.DurationHours)
		if err != nil {
			return mapComplianceError(err)
		}

		now := time.Now().UTC()
		return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
			"userId":       req.UserID,
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

		err := service.SetSelfExclusion(r.Context(), req.UserID, req.Permanent)
		if err != nil {
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
			"userId":        req.UserID,
			"status":        status,
			"excludedUntil": excludedUntil,
			"createdAt":     now.Format(time.RFC3339),
		})
	}))

	mux.Handle("/api/v1/compliance/rg/restrictions", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		userID := r.URL.Query().Get("userId")
		if userID == "" {
			return httpx.BadRequest("userId query parameter is required", map[string]any{"field": "userId"})
		}

		restrictions, err := service.GetPlayerRestrictions(r.Context(), userID)
		if err != nil {
			return mapComplianceError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"restrictions": restrictions,
		})
	}))
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
		return httpx.Forbidden("deposit limit exceeded")
	}
	if errors.Is(err, ErrBetLimitExceeded) {
		return httpx.Forbidden("bet limit exceeded")
	}
	if errors.Is(err, ErrUserBlocked) {
		return httpx.Forbidden("user account is blocked")
	}
	if errors.Is(err, ErrUserExcluded) {
		return httpx.Forbidden("user is self-excluded")
	}
	return httpx.Internal("compliance check failed", err)
}
