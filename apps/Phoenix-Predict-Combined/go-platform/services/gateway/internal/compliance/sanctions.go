package compliance

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// P0-4 (PAM spec §12 KYC, AML, Risk, and Compliance): person-level
// sanctions/OFAC + PEP screening. Decision 2026-07-02: OpenSanctions/yente,
// self-hosted, with the seam shaped like the alphacashier address-screening
// seam (fail-closed; the default provider never auto-clears; a real provider
// is wired by configuration, not code).
//
// Slice 1 is the engine only. Slice 2 captures the structured identity
// (name/DOB/country) at KYC submission; slice 3 refuses KYC approval while a
// subject's screening is unresolved or a hit — KYC approval is this system's
// onboarding gate (KYC_REQUIRED_FOR_TRADING), so that is where "enforce at
// onboarding" lands.

// PersonScreeningStatus is the outcome of screening one person.
type PersonScreeningStatus string

const (
	// PersonScreeningClear: no list match at or above the review threshold.
	PersonScreeningClear PersonScreeningStatus = "clear"
	// PersonScreeningPotentialMatch: a candidate match needs human review.
	PersonScreeningPotentialMatch PersonScreeningStatus = "potential_match"
	// PersonScreeningHit: the provider asserts a match (sanctions/PEP).
	PersonScreeningHit PersonScreeningStatus = "hit"
	// PersonScreeningUnavailable: screening could not be evaluated. Callers
	// must treat this as blocking, never as clear.
	PersonScreeningUnavailable PersonScreeningStatus = "unavailable"
)

// SanctionsSubject is the structured identity screened against the lists.
type SanctionsSubject struct {
	FullName    string // required
	DateOfBirth string // optional, YYYY-MM-DD
	Country     string // optional, ISO 3166-1 alpha-2
}

// PersonScreeningResult carries the verdict plus provider evidence for the
// audit/review trail.
type PersonScreeningResult struct {
	Status   PersonScreeningStatus `json:"status"`
	Score    float64               `json:"score"`              // best candidate score, 0..1
	MatchIDs []string              `json:"matchIds,omitempty"` // provider entity ids of matching candidates
	Provider string                `json:"provider"`
}

// PersonScreener screens one person. Implementations must be fail-closed: on
// any internal error return PersonScreeningUnavailable (with the error), never
// PersonScreeningClear.
type PersonScreener interface {
	ScreenPerson(ctx context.Context, subject SanctionsSubject) (PersonScreeningResult, error)
}

// manualReviewPersonScreener is the default: it never auto-clears, mirroring
// the KYC ManualReviewProvider and the alphacashier manualReviewScreener —
// every subject routes to human review until a real provider is configured.
type manualReviewPersonScreener struct{}

func (manualReviewPersonScreener) ScreenPerson(context.Context, SanctionsSubject) (PersonScreeningResult, error) {
	return PersonScreeningResult{Status: PersonScreeningPotentialMatch, Provider: "manual"}, nil
}

// NewManualReviewPersonScreener returns the never-auto-clear default.
func NewManualReviewPersonScreener() PersonScreener { return manualReviewPersonScreener{} }

// YenteScreener screens against a self-hosted OpenSanctions yente instance
// via its /match/{dataset} API (request/response shape per the yente v1 match
// endpoint; the deployment pins the yente version, and the opt-in live test
// guards drift). Verdict mapping:
//   - any candidate the provider flags match=true        → hit
//   - else best score >= reviewThreshold                 → potential_match
//   - else                                               → clear
//   - transport / non-200 / decode failure               → unavailable + error
type YenteScreener struct {
	baseURL         string
	dataset         string
	reviewThreshold float64
	client          *http.Client
}

// NewYenteScreener builds a screener for the given yente base URL.
func NewYenteScreener(baseURL, dataset string, reviewThreshold float64, client *http.Client) *YenteScreener {
	if dataset == "" {
		dataset = "default"
	}
	if reviewThreshold <= 0 || reviewThreshold > 1 {
		reviewThreshold = 0.5
	}
	if client == nil {
		client = &http.Client{Timeout: 8 * time.Second}
	}
	return &YenteScreener{
		baseURL:         strings.TrimRight(baseURL, "/"),
		dataset:         dataset,
		reviewThreshold: reviewThreshold,
		client:          client,
	}
}

type yenteQueryProperties struct {
	Name      []string `json:"name"`
	BirthDate []string `json:"birthDate,omitempty"`
	Country   []string `json:"country,omitempty"`
}

type yenteMatchRequest struct {
	Queries map[string]struct {
		Schema     string               `json:"schema"`
		Properties yenteQueryProperties `json:"properties"`
	} `json:"queries"`
}

type yenteMatchResponse struct {
	Responses map[string]struct {
		Results []struct {
			ID    string  `json:"id"`
			Score float64 `json:"score"`
			Match bool    `json:"match"`
		} `json:"results"`
	} `json:"responses"`
}

func (y *YenteScreener) ScreenPerson(ctx context.Context, subject SanctionsSubject) (PersonScreeningResult, error) {
	unavailable := PersonScreeningResult{Status: PersonScreeningUnavailable, Provider: "yente"}
	name := strings.TrimSpace(subject.FullName)
	if name == "" {
		return unavailable, fmt.Errorf("sanctions: subject full name is required")
	}
	props := yenteQueryProperties{Name: []string{name}}
	if dob := strings.TrimSpace(subject.DateOfBirth); dob != "" {
		props.BirthDate = []string{dob}
	}
	if c := strings.TrimSpace(subject.Country); c != "" {
		props.Country = []string{c}
	}
	req := yenteMatchRequest{Queries: map[string]struct {
		Schema     string               `json:"schema"`
		Properties yenteQueryProperties `json:"properties"`
	}{"q": {Schema: "Person", Properties: props}}}
	body, err := json.Marshal(req)
	if err != nil {
		return unavailable, fmt.Errorf("sanctions: encode match request: %w", err)
	}

	endpoint := y.baseURL + "/match/" + url.PathEscape(y.dataset)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return unavailable, fmt.Errorf("sanctions: build match request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := y.client.Do(httpReq)
	if err != nil {
		return unavailable, fmt.Errorf("sanctions: yente request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return unavailable, fmt.Errorf("sanctions: yente returned status %d", resp.StatusCode)
	}

	var parsed yenteMatchResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return unavailable, fmt.Errorf("sanctions: decode yente response: %w", err)
	}
	q, ok := parsed.Responses["q"]
	if !ok {
		return unavailable, fmt.Errorf("sanctions: yente response missing query result")
	}

	result := PersonScreeningResult{Status: PersonScreeningClear, Provider: "yente"}
	for _, cand := range q.Results {
		if cand.Score > result.Score {
			result.Score = cand.Score
		}
		if cand.Match {
			result.Status = PersonScreeningHit
			result.MatchIDs = append(result.MatchIDs, cand.ID)
		}
	}
	if result.Status != PersonScreeningHit && result.Score >= y.reviewThreshold {
		result.Status = PersonScreeningPotentialMatch
		for _, cand := range q.Results {
			if cand.Score >= y.reviewThreshold {
				result.MatchIDs = append(result.MatchIDs, cand.ID)
			}
		}
	}
	return result, nil
}

// PersonScreenerFromEnv selects the screener:
//
//	SANCTIONS_SCREENER = "" | "manual" → manual review (default, never auto-clears)
//	SANCTIONS_SCREENER = "yente"       → yente at SANCTIONS_YENTE_URL
//	                                     (dataset SANCTIONS_YENTE_DATASET,
//	                                      threshold SANCTIONS_REVIEW_THRESHOLD)
//	SANCTIONS_SCREENER = "off"         → nil (screening disabled — dev only;
//	                                     enforcement wiring decides what nil means)
//
// Misconfiguration fails CLOSED: an unknown value, or yente without a URL,
// selects the manual-review screener (which never auto-clears) and logs the
// problem — a typo can never silently disable screening.
func PersonScreenerFromEnv() PersonScreener {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("SANCTIONS_SCREENER")))
	switch mode {
	case "", "manual":
		return NewManualReviewPersonScreener()
	case "off":
		return nil
	case "yente":
		base := strings.TrimSpace(os.Getenv("SANCTIONS_YENTE_URL"))
		if base == "" {
			slog.Error("sanctions: SANCTIONS_SCREENER=yente but SANCTIONS_YENTE_URL is empty — falling back to manual review (fail-closed)")
			return NewManualReviewPersonScreener()
		}
		threshold := 0.5
		if raw := strings.TrimSpace(os.Getenv("SANCTIONS_REVIEW_THRESHOLD")); raw != "" {
			if v, err := strconv.ParseFloat(raw, 64); err == nil && v > 0 && v <= 1 {
				threshold = v
			} else {
				slog.Error("sanctions: invalid SANCTIONS_REVIEW_THRESHOLD — keeping default", "value", raw, "default", threshold)
			}
		}
		return NewYenteScreener(base, os.Getenv("SANCTIONS_YENTE_DATASET"), threshold, nil)
	default:
		slog.Error("sanctions: unknown SANCTIONS_SCREENER value — falling back to manual review (fail-closed)", "value", mode)
		return NewManualReviewPersonScreener()
	}
}
