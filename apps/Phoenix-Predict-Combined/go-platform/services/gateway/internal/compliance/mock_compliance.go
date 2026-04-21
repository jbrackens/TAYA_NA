package compliance

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"
)

type GeoSandboxConfig struct {
	Enabled bool
	Country string
	State   string
	City    string
}

// MockGeoComplianceService is an in-memory mock geo compliance service
type MockGeoComplianceService struct {
	mu                sync.RWMutex
	approvedCountries map[string]bool
	locationHistory   map[string][]*LocationResult
	sandboxConfig     GeoSandboxConfig
}

// NewMockGeoComplianceService creates a new mock geo compliance service
func NewMockGeoComplianceService() *MockGeoComplianceService {
	return NewMockGeoComplianceServiceWithConfig(defaultApprovedCountries(), GeoSandboxConfig{})
}

func NewMockGeoComplianceServiceFromEnv() *MockGeoComplianceService {
	return NewMockGeoComplianceServiceWithConfig(
		parseApprovedCountriesEnv(os.Getenv("COMPLIANCE_GEO_APPROVED_COUNTRIES")),
		GeoSandboxConfig{
			Enabled: parseBoolEnv(os.Getenv("COMPLIANCE_GEO_SANDBOX_MODE")),
			Country: strings.ToUpper(strings.TrimSpace(defaultStringEnv(os.Getenv("COMPLIANCE_GEO_SANDBOX_COUNTRY"), "US"))),
			State:   strings.TrimSpace(os.Getenv("COMPLIANCE_GEO_SANDBOX_STATE")),
			City:    strings.TrimSpace(defaultStringEnv(os.Getenv("COMPLIANCE_GEO_SANDBOX_CITY"), "Sandbox City")),
		},
	)
}

func NewMockGeoComplianceServiceWithConfig(approvedCountries map[string]bool, sandboxConfig GeoSandboxConfig) *MockGeoComplianceService {
	if len(approvedCountries) == 0 {
		approvedCountries = defaultApprovedCountries()
	}
	if sandboxConfig.Country == "" {
		sandboxConfig.Country = "US"
	}
	return &MockGeoComplianceService{
		approvedCountries: approvedCountries,
		locationHistory:   make(map[string][]*LocationResult),
		sandboxConfig:     sandboxConfig,
	}
}

func (m *MockGeoComplianceService) VerifyLocation(ctx context.Context, userID string, latitude float64, longitude float64) (*LocationResult, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	if latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 {
		return nil, ErrInvalidLocation
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if m.sandboxConfig.Enabled {
		result := &LocationResult{
			UserID:    userID,
			Latitude:  latitude,
			Longitude: longitude,
			Status:    "approved",
			Message:   "Location approved in sandbox mode",
			Country:   m.sandboxConfig.Country,
			State:     m.sandboxConfig.State,
			City:      m.sandboxConfig.City,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
		m.locationHistory[userID] = append(m.locationHistory[userID], result)
		return result, nil
	}

	// Simple mock: determine country by coordinates
	country := m.getCountryFromCoords(latitude, longitude)
	status := "approved"
	message := "Location approved for gaming"

	if !m.approvedCountries[country] {
		status = "declined"
		message = "Gaming not available in this location"
	}

	result := &LocationResult{
		UserID:    userID,
		Latitude:  latitude,
		Longitude: longitude,
		Status:    status,
		Message:   message,
		Country:   country,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	m.locationHistory[userID] = append(m.locationHistory[userID], result)
	return result, nil
}

func (m *MockGeoComplianceService) GetApprovedCountries(ctx context.Context) ([]string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	countries := make([]string, 0, len(m.approvedCountries))
	for country := range m.approvedCountries {
		countries = append(countries, country)
	}
	return countries, nil
}

func (m *MockGeoComplianceService) IsLocationApproved(ctx context.Context, country string, state string) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.sandboxConfig.Enabled {
		return true, nil
	}

	approved, found := m.approvedCountries[country]
	return approved && found, nil
}

func defaultApprovedCountries() map[string]bool {
	return map[string]bool{
		"US": true,
		"CA": true,
		"GB": true,
		"IE": true,
		"AU": true,
		"NZ": true,
	}
}

func parseApprovedCountriesEnv(raw string) map[string]bool {
	countries := map[string]bool{}
	for _, token := range strings.Split(raw, ",") {
		country := strings.ToUpper(strings.TrimSpace(token))
		if country != "" {
			countries[country] = true
		}
	}
	if len(countries) == 0 {
		return defaultApprovedCountries()
	}
	return countries
}

func parseBoolEnv(raw string) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func defaultStringEnv(raw string, fallback string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return fallback
	}
	return value
}

func (m *MockGeoComplianceService) getCountryFromCoords(lat float64, lng float64) string {
	// Simple mock mapping based on rough coordinates
	if lat > 25 && lat < 50 && lng > -130 && lng < -60 {
		return "US"
	}
	if lat > 40 && lat < 60 && lng > -140 && lng < -50 {
		return "CA"
	}
	if lat > 50 && lat < 60 && lng > -10 && lng < 5 {
		return "GB"
	}
	if lat > 51 && lat < 56 && lng > -12 && lng < -5 {
		return "IE"
	}
	if lat < -10 && lat > -45 && lng > 110 && lng < 160 {
		return "AU"
	}
	if lat < -30 && lat > -50 && lng > 160 && lng < 180 {
		return "NZ"
	}
	return "XX" // Unknown country
}

// MockKYCService is an in-memory mock KYC service
type MockKYCService struct {
	mu        sync.RWMutex
	statuses  map[string]*KYCStatus
	documents map[string][]VerificationDocument
	docSeq    int64
}

// NewMockKYCService creates a new mock KYC service
func NewMockKYCService() *MockKYCService {
	return &MockKYCService{
		statuses:  make(map[string]*KYCStatus),
		documents: make(map[string][]VerificationDocument),
	}
}

func (m *MockKYCService) VerifyIdentity(ctx context.Context, userID string, docs []VerificationDocument) (*KYCResult, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	if len(docs) == 0 {
		return nil, ErrInvalidDocument
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now().UTC()
	expiresAt := now.AddDate(2, 0, 0) // 2 years from now

	result := &KYCResult{
		UserID:           userID,
		Status:           "approved",
		VerificationType: "document",
		RiskLevel:        "low",
		Message:          "Identity verified",
		VerifiedAt:       now.Format(time.RFC3339),
		ExpiresAt:        expiresAt.Format(time.RFC3339),
		DocumentType:     docs[0].Type,
	}

	// Update status
	status := &KYCStatus{
		UserID:             userID,
		Status:             "approved",
		RiskLevel:          "low",
		LastVerifiedAt:     now.Format(time.RFC3339),
		ExpiresAt:          expiresAt.Format(time.RFC3339),
		DocumentsSubmitted: make([]string, 0),
	}

	for _, doc := range docs {
		doc.Status = "approved"
		doc.VerifiedAt = now.Format(time.RFC3339)
		m.documents[userID] = append(m.documents[userID], doc)
		status.DocumentsSubmitted = append(status.DocumentsSubmitted, doc.Type)
	}

	m.statuses[userID] = status
	return result, nil
}

func (m *MockKYCService) GetVerificationStatus(ctx context.Context, userID string) (*KYCStatus, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	status, found := m.statuses[userID]
	if !found {
		return &KYCStatus{
			UserID:    userID,
			Status:    "unverified",
			RiskLevel: "unknown",
		}, nil
	}

	// Return a copy
	copy := *status
	return &copy, nil
}

func (m *MockKYCService) SubmitDocument(ctx context.Context, userID string, doc VerificationDocument) (*VerificationDocument, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	if doc.Type == "" {
		return nil, ErrInvalidDocument
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.docSeq++
	doc.ID = fmt.Sprintf("doc:%d", m.docSeq)
	doc.UserID = userID
	doc.SubmittedAt = time.Now().UTC().Format(time.RFC3339)
	doc.Status = "submitted"

	m.documents[userID] = append(m.documents[userID], doc)
	return &doc, nil
}

func (m *MockKYCService) ListDocuments(ctx context.Context, userID string) ([]VerificationDocument, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	docs, found := m.documents[userID]
	if !found {
		return []VerificationDocument{}, nil
	}

	// Return a copy
	result := make([]VerificationDocument, len(docs))
	copy(result, docs)
	return result, nil
}

// MockResponsibleGamblingService is an in-memory mock RG service with actual limit tracking
type MockResponsibleGamblingService struct {
	mu              sync.RWMutex
	depositLimits   map[string][]DepositLimit
	betLimits       map[string][]BetLimit
	coolOffs        map[string]time.Time
	selfExclusions  map[string]*SelfExclusionRecord
	depositTracking map[string]*PeriodTracking
	betTracking     map[string]*PeriodTracking
}

type SelfExclusionRecord struct {
	UserID    string
	Permanent bool
	StartedAt time.Time
	EndsAt    time.Time
}

type PeriodTracking struct {
	Period  string // daily, weekly, monthly
	Amount  int64
	ResetAt time.Time
}

// NewMockResponsibleGamblingService creates a new mock RG service
func NewMockResponsibleGamblingService() *MockResponsibleGamblingService {
	return &MockResponsibleGamblingService{
		depositLimits:   make(map[string][]DepositLimit),
		betLimits:       make(map[string][]BetLimit),
		coolOffs:        make(map[string]time.Time),
		selfExclusions:  make(map[string]*SelfExclusionRecord),
		depositTracking: make(map[string]*PeriodTracking),
		betTracking:     make(map[string]*PeriodTracking),
	}
}

func (m *MockResponsibleGamblingService) SetDepositLimit(ctx context.Context, userID string, period string, amountCents int64) error {
	if userID == "" {
		return ErrInvalidUserID
	}
	if !isValidPeriod(period) {
		return ErrInvalidLimitPeriod
	}
	if amountCents <= 0 {
		return ErrInvalidLimitPeriod
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now().UTC()
	resetAt := getResetTime(now, period)

	limit := DepositLimit{
		UserID:         userID,
		Period:         period,
		LimitCents:     amountCents,
		RemainingCents: amountCents,
		UsedCents:      0,
		ResetsAt:       resetAt.Format(time.RFC3339),
		CreatedAt:      now.Format(time.RFC3339),
	}

	m.depositLimits[userID] = upsertDepositLimit(m.depositLimits[userID], limit)
	return nil
}

func (m *MockResponsibleGamblingService) GetDepositLimits(ctx context.Context, userID string) ([]DepositLimit, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	limits, found := m.depositLimits[userID]
	if !found {
		return []DepositLimit{}, nil
	}
	now := time.Now().UTC()
	for i := range limits {
		refreshDepositLimitState(&limits[i], now)
	}
	m.depositLimits[userID] = limits

	result := make([]DepositLimit, len(limits))
	copy(result, limits)
	return result, nil
}

func (m *MockResponsibleGamblingService) SetBetLimit(ctx context.Context, userID string, period string, amountCents int64) error {
	if userID == "" {
		return ErrInvalidUserID
	}
	if !isValidPeriod(period) {
		return ErrInvalidLimitPeriod
	}
	if amountCents <= 0 {
		return ErrInvalidLimitPeriod
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now().UTC()
	resetAt := getResetTime(now, period)

	limit := BetLimit{
		UserID:         userID,
		Period:         period,
		LimitCents:     amountCents,
		RemainingCents: amountCents,
		UsedCents:      0,
		ResetsAt:       resetAt.Format(time.RFC3339),
		CreatedAt:      now.Format(time.RFC3339),
	}

	m.betLimits[userID] = upsertBetLimit(m.betLimits[userID], limit)
	return nil
}

func (m *MockResponsibleGamblingService) GetBetLimits(ctx context.Context, userID string) ([]BetLimit, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	limits, found := m.betLimits[userID]
	if !found {
		return []BetLimit{}, nil
	}
	now := time.Now().UTC()
	for i := range limits {
		refreshBetLimitState(&limits[i], now)
	}
	m.betLimits[userID] = limits

	result := make([]BetLimit, len(limits))
	copy(result, limits)
	return result, nil
}

func (m *MockResponsibleGamblingService) CheckDepositAllowed(ctx context.Context, userID string, amountCents int64) (bool, string, error) {
	if userID == "" {
		return false, "Invalid user", ErrInvalidUserID
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	// Check if user is blocked
	if _, found := m.selfExclusions[userID]; found {
		se := m.selfExclusions[userID]
		if se.Permanent || time.Now().Before(se.EndsAt) {
			return false, "User is self-excluded", ErrUserExcluded
		}
	}

	// Check cool-off
	if coolOffUntil, found := m.coolOffs[userID]; found {
		if time.Now().Before(coolOffUntil) {
			return false, fmt.Sprintf("Cool-off period active until %s", coolOffUntil.Format(time.RFC3339)), ErrUserBlocked
		}
	}

	// Check deposit limits
	limits, found := m.depositLimits[userID]
	if found {
		now := time.Now().UTC()
		for i := range limits {
			refreshDepositLimitState(&limits[i], now)
			if limits[i].RemainingCents < amountCents {
				m.depositLimits[userID] = limits
				return false, fmt.Sprintf("Deposit limit exceeded for %s period", limits[i].Period), ErrDepositLimitExceeded
			}
		}
		m.depositLimits[userID] = limits
	}

	return true, "", nil
}

func (m *MockResponsibleGamblingService) CheckBetAllowed(ctx context.Context, userID string, stakeCents int64) (bool, string, error) {
	if userID == "" {
		return false, "Invalid user", ErrInvalidUserID
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Check if user is blocked
	if _, found := m.selfExclusions[userID]; found {
		se := m.selfExclusions[userID]
		if se.Permanent || time.Now().Before(se.EndsAt) {
			return false, "User is self-excluded", ErrUserExcluded
		}
	}

	// Check cool-off
	if coolOffUntil, found := m.coolOffs[userID]; found {
		if time.Now().Before(coolOffUntil) {
			return false, fmt.Sprintf("Cool-off period active until %s", coolOffUntil.Format(time.RFC3339)), ErrUserBlocked
		}
	}

	// Check bet limits
	limits, found := m.betLimits[userID]
	if found {
		now := time.Now().UTC()
		for i := range limits {
			refreshBetLimitState(&limits[i], now)
			if limits[i].RemainingCents < stakeCents {
				m.betLimits[userID] = limits
				return false, fmt.Sprintf("Bet limit exceeded for %s period", limits[i].Period), ErrBetLimitExceeded
			}
		}
		m.betLimits[userID] = limits
	}

	return true, "", nil
}

func (m *MockResponsibleGamblingService) SetCoolOff(ctx context.Context, userID string, durationHours int) error {
	if userID == "" {
		return ErrInvalidUserID
	}
	if durationHours <= 0 {
		return ErrInvalidLimitPeriod
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.coolOffs[userID] = time.Now().Add(time.Duration(durationHours) * time.Hour)
	return nil
}

func (m *MockResponsibleGamblingService) SetSelfExclusion(ctx context.Context, userID string, permanent bool) error {
	if userID == "" {
		return ErrInvalidUserID
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	endsAt := time.Time{}
	if !permanent {
		endsAt = time.Now().AddDate(0, 0, 30) // 30 days
	}

	m.selfExclusions[userID] = &SelfExclusionRecord{
		UserID:    userID,
		Permanent: permanent,
		StartedAt: time.Now(),
		EndsAt:    endsAt,
	}
	return nil
}

func (m *MockResponsibleGamblingService) GetPlayerRestrictions(ctx context.Context, userID string) (*PlayerRestrictions, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	now := time.Now()
	restrictions := &PlayerRestrictions{
		UserID:        userID,
		IsBlocked:     false,
		IsOnCoolOff:   false,
		IsExcluded:    false,
		DepositLimits: []DepositLimit{},
		BetLimits:     []BetLimit{},
		LastUpdated:   now.UTC().Format(time.RFC3339),
	}

	// Check cool-off
	if coolOffUntil, found := m.coolOffs[userID]; found {
		if now.Before(coolOffUntil) {
			restrictions.IsOnCoolOff = true
			restrictions.CoolOffUntil = coolOffUntil.UTC().Format(time.RFC3339)
		}
	}

	// Check self-exclusion
	if se, found := m.selfExclusions[userID]; found {
		if se.Permanent || now.Before(se.EndsAt) {
			restrictions.IsExcluded = true
			restrictions.ExclusionType = "temporary"
			if se.Permanent {
				restrictions.ExclusionType = "permanent"
			} else {
				restrictions.ExcludedUntil = se.EndsAt.UTC().Format(time.RFC3339)
			}
			restrictions.IsBlocked = true
		}
	}

	// Add limits
	if limits, found := m.depositLimits[userID]; found {
		restrictions.DepositLimits = limits
	}
	if limits, found := m.betLimits[userID]; found {
		restrictions.BetLimits = limits
	}

	return restrictions, nil
}

func (m *MockResponsibleGamblingService) RecordDeposit(ctx context.Context, userID string, amountCents int64) error {
	if userID == "" {
		return ErrInvalidUserID
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now().UTC()

	// Update tracking
	tracking, found := m.depositTracking[userID]
	if !found || !tracking.ResetAt.After(now) {
		tracking = &PeriodTracking{
			Period:  "daily",
			Amount:  0,
			ResetAt: getResetTime(now, "daily"),
		}
	}
	tracking.Amount += amountCents
	m.depositTracking[userID] = tracking

	// Update limits
	limits, found := m.depositLimits[userID]
	if found {
		for i := range limits {
			refreshDepositLimitState(&limits[i], now)
			limits[i].UsedCents += amountCents
			limits[i].RemainingCents = limits[i].LimitCents - limits[i].UsedCents
			if limits[i].RemainingCents < 0 {
				limits[i].RemainingCents = 0
			}
		}
		m.depositLimits[userID] = limits
	}

	return nil
}

func (m *MockResponsibleGamblingService) RecordBet(ctx context.Context, userID string, stakeCents int64) error {
	if userID == "" {
		return ErrInvalidUserID
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now().UTC()

	// Update tracking
	tracking, found := m.betTracking[userID]
	if !found || !tracking.ResetAt.After(now) {
		tracking = &PeriodTracking{
			Period:  "daily",
			Amount:  0,
			ResetAt: getResetTime(now, "daily"),
		}
	}
	tracking.Amount += stakeCents
	m.betTracking[userID] = tracking

	// Update limits
	limits, found := m.betLimits[userID]
	if found {
		for i := range limits {
			refreshBetLimitState(&limits[i], now)
			limits[i].UsedCents += stakeCents
			limits[i].RemainingCents = limits[i].LimitCents - limits[i].UsedCents
			if limits[i].RemainingCents < 0 {
				limits[i].RemainingCents = 0
			}
		}
		m.betLimits[userID] = limits
	}

	return nil
}

func upsertDepositLimit(existing []DepositLimit, next DepositLimit) []DepositLimit {
	for i := range existing {
		if existing[i].Period == next.Period {
			existing[i] = next
			return existing
		}
	}
	return append(existing, next)
}

func upsertBetLimit(existing []BetLimit, next BetLimit) []BetLimit {
	for i := range existing {
		if existing[i].Period == next.Period {
			existing[i] = next
			return existing
		}
	}
	return append(existing, next)
}

func refreshDepositLimitState(limit *DepositLimit, now time.Time) {
	resetAt, err := time.Parse(time.RFC3339, limit.ResetsAt)
	if err != nil || !now.Before(resetAt) {
		limit.UsedCents = 0
		limit.RemainingCents = limit.LimitCents
		limit.ResetsAt = getResetTime(now, limit.Period).Format(time.RFC3339)
	}
	if limit.RemainingCents < 0 {
		limit.RemainingCents = 0
	}
}

func refreshBetLimitState(limit *BetLimit, now time.Time) {
	resetAt, err := time.Parse(time.RFC3339, limit.ResetsAt)
	if err != nil || !now.Before(resetAt) {
		limit.UsedCents = 0
		limit.RemainingCents = limit.LimitCents
		limit.ResetsAt = getResetTime(now, limit.Period).Format(time.RFC3339)
	}
	if limit.RemainingCents < 0 {
		limit.RemainingCents = 0
	}
}

func isValidPeriod(period string) bool {
	return period == "daily" || period == "weekly" || period == "monthly"
}

func getResetTime(now time.Time, period string) time.Time {
	switch period {
	case "daily":
		return now.AddDate(0, 0, 1).Truncate(24 * time.Hour)
	case "weekly":
		daysUntilMonday := int((time.Monday - now.Weekday() + 7) % 7)
		if daysUntilMonday == 0 {
			daysUntilMonday = 7
		}
		return now.AddDate(0, 0, daysUntilMonday).Truncate(24 * time.Hour)
	case "monthly":
		return now.AddDate(0, 1, 0).Truncate(24 * time.Hour)
	default:
		return now.AddDate(0, 0, 1)
	}
}
