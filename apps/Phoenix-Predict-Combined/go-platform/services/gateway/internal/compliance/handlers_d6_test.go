package compliance

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

// D-6: the RG self-service mutation handlers historically trusted a body
// `userId`, so any authenticated user could set another user's limits /
// cool-off / (irreversible) self-exclusion by guessing their deterministic
// userID. They must now bind the mutation to the authenticated session.
func TestRGMutations_SessionBound(t *testing.T) {
	newStack := func() *http.ServeMux {
		mux := http.NewServeMux()
		registerResponsibleGamblingRoutes(mux, NewMockResponsibleGamblingService())
		return mux
	}
	post := func(mux *http.ServeMux, path, body string, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if sessionUID != "" {
			req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		}
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}
	excluded := func(mux *http.ServeMux, uid string) bool {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/compliance/rg/restrictions?userId="+uid, nil)
		req = req.WithContext(httpx.WithTestUser(context.Background(), uid, uid, "player"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		var out struct {
			Restrictions struct {
				IsExcluded bool `json:"isExcluded"`
			} `json:"restrictions"`
		}
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		return out.Restrictions.IsExcluded
	}

	t.Run("self-exclude cross-user is forbidden and has no effect", func(t *testing.T) {
		mux := newStack()
		// Attacker session tries to self-exclude an unrelated victim.
		rec := post(mux, "/api/v1/compliance/rg/self-exclude",
			`{"userId":"u-victim","permanent":true}`, "u-attacker")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("cross-user self-exclude must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
		if !strings.Contains(rec.Body.String(), "cannot access another user's") {
			t.Fatalf("expected ownership rejection, got %s", rec.Body.String())
		}
		if excluded(mux, "u-victim") {
			t.Fatal("victim must NOT be self-excluded by another user (irreversible griefing)")
		}
	})

	t.Run("self-exclude for own session succeeds", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/rg/self-exclude",
			`{"userId":"u-self","permanent":false}`, "u-self")
		if rec.Code != http.StatusCreated {
			t.Fatalf("self self-exclude must be 201, got %d (%s)", rec.Code, rec.Body.String())
		}
		if !excluded(mux, "u-self") {
			t.Fatal("own self-exclusion must take effect")
		}
	})

	t.Run("cool-off for own session succeeds and reflects the session userId", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/rg/cool-off",
			`{"userId":"u-self","durationHours":24}`, "u-self")
		if rec.Code != http.StatusCreated {
			t.Fatalf("self cool-off must be 201, got %d (%s)", rec.Code, rec.Body.String())
		}
		if !strings.Contains(rec.Body.String(), `"userId":"u-self"`) {
			t.Fatalf("response must reflect the session userId, got %s", rec.Body.String())
		}
	})

	t.Run("unauthenticated context is forbidden", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/rg/bet-limit",
			`{"userId":"u-x","period":"daily","amountCents":500}`, "")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("no session must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
	})

	t.Run("bet-limit cross-user is forbidden", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/rg/bet-limit",
			`{"userId":"u-victim","period":"daily","amountCents":1}`, "u-attacker")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("cross-user bet-limit must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
	})
}

func TestRGPointUseLimitAliases(t *testing.T) {
	mux := http.NewServeMux()
	registerResponsibleGamblingRoutes(mux, NewMockResponsibleGamblingService())

	post := func(path string, body string, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}
	get := func(path string, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}

	rec := post("/api/v1/compliance/rg/point-use-limit",
		`{"userId":"u-self","period":"daily","amountPointsCents":1200}`, "u-self")
	if rec.Code != http.StatusCreated {
		t.Fatalf("point-use limit alias must set a limit, got %d (%s)", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"amountPointsCents":1200`) ||
		!strings.Contains(rec.Body.String(), `"unit":"PTS"`) {
		t.Fatalf("point-use response should expose effective point amount, got %s", rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "deposit-limits") {
		t.Fatalf("point-use response should not direct launch callers to deposit-limits, got %s", rec.Body.String())
	}

	rec = get("/api/v1/compliance/rg/point-use-limits?userId=u-self", "u-self")
	if rec.Code != http.StatusOK {
		t.Fatalf("point-use limits alias must list limits, got %d (%s)", rec.Code, rec.Body.String())
	}
	var pointUseOut struct {
		UserID string `json:"userId"`
		Unit   string `json:"unit"`
		Limits []struct {
			Period               string `json:"period"`
			Unit                 string `json:"unit"`
			LimitPointsCents     int64  `json:"limitPointsCents"`
			RemainingPointsCents int64  `json:"remainingPointsCents"`
			UsedPointsCents      int64  `json:"usedPointsCents"`
			LimitCents           int64  `json:"limitCents"`
		} `json:"limits"`
		Total int `json:"total"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &pointUseOut); err != nil {
		t.Fatalf("invalid point-use limits JSON: %v", err)
	}
	if pointUseOut.UserID != "u-self" || pointUseOut.Unit != "PTS" || pointUseOut.Total != 1 || len(pointUseOut.Limits) != 1 {
		t.Fatalf("unexpected point-use limits response: %+v", pointUseOut)
	}
	if pointUseOut.Limits[0].Period != "daily" ||
		pointUseOut.Limits[0].Unit != "PTS" ||
		pointUseOut.Limits[0].LimitPointsCents != 1200 ||
		pointUseOut.Limits[0].RemainingPointsCents != 1200 ||
		pointUseOut.Limits[0].UsedPointsCents != 0 ||
		pointUseOut.Limits[0].LimitCents != 1200 {
		t.Fatalf("point-use limits should mirror stored limit, got %+v", pointUseOut.Limits[0])
	}

	rec = get("/api/v1/compliance/rg/deposit-limits?userId=u-self", "u-self")
	if rec.Code != http.StatusOK {
		t.Fatalf("legacy deposit-limits compatibility path must still list limits, got %d (%s)", rec.Code, rec.Body.String())
	}

	rec = post("/api/v1/compliance/rg/point-use-limit",
		`{"userId":"u-self","period":"daily","amountCents":999}`, "u-self")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("launch point-use limit must reject retired amountCents, got %d (%s)", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "amountPointsCents") {
		t.Fatalf("launch point-use limit rejection should name amountPointsCents, got %s", rec.Body.String())
	}

	rec = post("/api/v1/compliance/rg/deposit-limit",
		`{"userId":"u-self","period":"weekly","amountCents":1500}`, "u-self")
	if rec.Code != http.StatusCreated {
		t.Fatalf("legacy deposit-limit compatibility path must still accept amountCents, got %d (%s)", rec.Code, rec.Body.String())
	}

	rec = post("/api/v1/compliance/rg/point-use-limit",
		`{"userId":"u-victim","period":"daily","amountPointsCents":999}`, "u-attacker")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-user point-use limit must be 403, got %d (%s)", rec.Code, rec.Body.String())
	}
}

func TestRGPredictionLimitAliases(t *testing.T) {
	mux := http.NewServeMux()
	registerResponsibleGamblingRoutes(mux, NewMockResponsibleGamblingService())

	post := func(path string, body string, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}
	get := func(path string, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}

	rec := post("/api/v1/compliance/rg/prediction-limit",
		`{"userId":"u-self","period":"daily","amountPointsCents":700}`, "u-self")
	if rec.Code != http.StatusCreated {
		t.Fatalf("prediction limit alias must set a limit, got %d (%s)", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"amountPointsCents":700`) ||
		!strings.Contains(rec.Body.String(), `"unit":"PTS"`) {
		t.Fatalf("prediction-limit response should expose effective point amount, got %s", rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "bet-limits") {
		t.Fatalf("prediction-limit response should not direct launch callers to bet-limits, got %s", rec.Body.String())
	}

	rec = get("/api/v1/compliance/rg/prediction-limits?userId=u-self", "u-self")
	if rec.Code != http.StatusOK {
		t.Fatalf("prediction limits alias must list limits, got %d (%s)", rec.Code, rec.Body.String())
	}
	var predictionOut struct {
		UserID string `json:"userId"`
		Unit   string `json:"unit"`
		Limits []struct {
			Period               string `json:"period"`
			Unit                 string `json:"unit"`
			LimitPointsCents     int64  `json:"limitPointsCents"`
			RemainingPointsCents int64  `json:"remainingPointsCents"`
			UsedPointsCents      int64  `json:"usedPointsCents"`
			LimitCents           int64  `json:"limitCents"`
		} `json:"limits"`
		Total int `json:"total"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &predictionOut); err != nil {
		t.Fatalf("invalid prediction limits JSON: %v", err)
	}
	if predictionOut.UserID != "u-self" || predictionOut.Unit != "PTS" || predictionOut.Total != 1 || len(predictionOut.Limits) != 1 {
		t.Fatalf("unexpected prediction limits response: %+v", predictionOut)
	}
	if predictionOut.Limits[0].Period != "daily" ||
		predictionOut.Limits[0].Unit != "PTS" ||
		predictionOut.Limits[0].LimitPointsCents != 700 ||
		predictionOut.Limits[0].RemainingPointsCents != 700 ||
		predictionOut.Limits[0].UsedPointsCents != 0 ||
		predictionOut.Limits[0].LimitCents != 700 {
		t.Fatalf("prediction limits should mirror stored limit, got %+v", predictionOut.Limits[0])
	}

	rec = get("/api/v1/compliance/rg/bet-limits?userId=u-self", "u-self")
	if rec.Code != http.StatusOK {
		t.Fatalf("legacy bet-limits compatibility path must still list limits, got %d (%s)", rec.Code, rec.Body.String())
	}

	rec = post("/api/v1/compliance/rg/prediction-limit",
		`{"userId":"u-self","period":"daily","amountCents":999}`, "u-self")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("launch prediction limit must reject retired amountCents, got %d (%s)", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "amountPointsCents") {
		t.Fatalf("launch prediction limit rejection should name amountPointsCents, got %s", rec.Body.String())
	}

	rec = post("/api/v1/compliance/rg/bet-limit",
		`{"userId":"u-self","period":"weekly","amountCents":900}`, "u-self")
	if rec.Code != http.StatusCreated {
		t.Fatalf("legacy bet-limit compatibility path must still accept amountCents, got %d (%s)", rec.Code, rec.Body.String())
	}

	rec = post("/api/v1/compliance/rg/prediction-limit",
		`{"userId":"u-victim","period":"daily","amountPointsCents":999}`, "u-attacker")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-user prediction limit must be 403, got %d (%s)", rec.Code, rec.Body.String())
	}
}

func TestRGCheckAndRestrictionsPointAliases(t *testing.T) {
	mux := http.NewServeMux()
	registerResponsibleGamblingRoutes(mux, NewMockResponsibleGamblingService())

	request := func(method string, path string, body string, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}

	rec := request(http.MethodPost, "/api/v1/compliance/rg/point-use-limit",
		`{"userId":"u-self","period":"daily","amountPointsCents":1200}`, "u-self")
	if rec.Code != http.StatusCreated {
		t.Fatalf("point-use setup must succeed, got %d (%s)", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodPost, "/api/v1/compliance/rg/prediction-limit",
		`{"userId":"u-self","period":"daily","amountPointsCents":700}`, "u-self")
	if rec.Code != http.StatusCreated {
		t.Fatalf("prediction setup must succeed, got %d (%s)", rec.Code, rec.Body.String())
	}

	rec = request(http.MethodGet, "/api/v1/compliance/rg/check-point-use?userId=u-self&amountPointsCents=500", "", "u-self")
	if rec.Code != http.StatusOK {
		t.Fatalf("check-point-use must succeed, got %d (%s)", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"amountPointsCents":500`) ||
		!strings.Contains(rec.Body.String(), `"unit":"PTS"`) {
		t.Fatalf("check-point-use should expose point-native amount, got %s", rec.Body.String())
	}

	rec = request(http.MethodGet, "/api/v1/compliance/rg/check-point-use?userId=u-self&amountPointsCents=1300", "", "u-self")
	if rec.Code != http.StatusOK {
		t.Fatalf("over-limit check-point-use must return a decision payload, got %d (%s)", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"allowed":false`) ||
		!strings.Contains(rec.Body.String(), `"reasonCode":"point_use_limit_exceeded"`) ||
		!strings.Contains(rec.Body.String(), "Point-use limit exceeded") {
		t.Fatalf("check-point-use denial should use point-use language, got %s", rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "Deposit limit") || strings.Contains(rec.Body.String(), "deposit limit") {
		t.Fatalf("check-point-use denial should not expose deposit-limit copy, got %s", rec.Body.String())
	}

	rec = request(http.MethodGet, "/api/v1/compliance/rg/check-point-use?userId=u-self&amountCents=500", "", "u-self")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("launch check-point-use must reject retired amountCents query, got %d (%s)", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "amountPointsCents") {
		t.Fatalf("launch check-point-use rejection should name amountPointsCents, got %s", rec.Body.String())
	}

	rec = request(http.MethodGet, "/api/v1/compliance/rg/check-deposit?userId=u-self&amountCents=500", "", "u-self")
	if rec.Code != http.StatusOK {
		t.Fatalf("legacy check-deposit compatibility path must still accept amountCents, got %d (%s)", rec.Code, rec.Body.String())
	}

	rec = request(http.MethodGet, "/api/v1/compliance/rg/check-prediction?userId=u-self&amountPointsCents=500", "", "u-self")
	if rec.Code != http.StatusOK {
		t.Fatalf("check-prediction must succeed, got %d (%s)", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"amountPointsCents":500`) ||
		!strings.Contains(rec.Body.String(), `"unit":"PTS"`) {
		t.Fatalf("check-prediction should expose point-native amount, got %s", rec.Body.String())
	}
	for _, retired := range []string{`"stakePointsCents"`, `"stakeCents"`} {
		if strings.Contains(rec.Body.String(), retired) {
			t.Fatalf("check-prediction should not expose retired stake alias %s, got %s", retired, rec.Body.String())
		}
	}

	rec = request(http.MethodGet, "/api/v1/compliance/rg/check-prediction?userId=u-self&amountPointsCents=800", "", "u-self")
	if rec.Code != http.StatusOK {
		t.Fatalf("over-limit check-prediction must return a decision payload, got %d (%s)", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"allowed":false`) ||
		!strings.Contains(rec.Body.String(), `"reasonCode":"prediction_limit_exceeded"`) ||
		!strings.Contains(rec.Body.String(), "Prediction limit exceeded") {
		t.Fatalf("check-prediction denial should use prediction language, got %s", rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "Bet limit") || strings.Contains(rec.Body.String(), "bet limit") {
		t.Fatalf("check-prediction denial should not expose bet-limit copy, got %s", rec.Body.String())
	}

	for _, alias := range []string{"stakePointsCents", "stakeCents"} {
		rec = request(http.MethodGet, "/api/v1/compliance/rg/check-prediction?userId=u-self&"+alias+"=500", "", "u-self")
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("launch check-prediction must reject retired %s query, got %d (%s)", alias, rec.Code, rec.Body.String())
		}
		if !strings.Contains(rec.Body.String(), "amountPointsCents") {
			t.Fatalf("launch check-prediction rejection should name amountPointsCents, got %s", rec.Body.String())
		}
	}

	rec = request(http.MethodGet, "/api/v1/compliance/rg/check-bet?userId=u-self&stakeCents=500", "", "u-self")
	if rec.Code != http.StatusOK {
		t.Fatalf("legacy check-bet compatibility path must still accept stakeCents, got %d (%s)", rec.Code, rec.Body.String())
	}

	rec = request(http.MethodGet, "/api/v1/compliance/rg/restrictions?userId=u-self", "", "u-self")
	if rec.Code != http.StatusOK {
		t.Fatalf("restrictions must succeed, got %d (%s)", rec.Code, rec.Body.String())
	}
	var out struct {
		Restrictions struct {
			UserID         string `json:"userId"`
			Unit           string `json:"unit"`
			PointUseLimits []struct {
				Unit             string `json:"unit"`
				LimitPointsCents int64  `json:"limitPointsCents"`
			} `json:"pointUseLimits"`
			PredictionLimits []struct {
				Unit             string `json:"unit"`
				LimitPointsCents int64  `json:"limitPointsCents"`
			} `json:"predictionLimits"`
			DepositLimits []struct {
				LimitCents int64 `json:"limitCents"`
			} `json:"depositLimits"`
			BetLimits []struct {
				LimitCents int64 `json:"limitCents"`
			} `json:"betLimits"`
		} `json:"restrictions"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("invalid restrictions JSON: %v", err)
	}
	if out.Restrictions.UserID != "u-self" || out.Restrictions.Unit != "PTS" {
		t.Fatalf("unexpected restrictions identity/unit: %+v", out.Restrictions)
	}
	if len(out.Restrictions.PointUseLimits) != 1 ||
		out.Restrictions.PointUseLimits[0].Unit != "PTS" ||
		out.Restrictions.PointUseLimits[0].LimitPointsCents != 1200 {
		t.Fatalf("restrictions should expose point-use aliases, got %+v", out.Restrictions.PointUseLimits)
	}
	if len(out.Restrictions.PredictionLimits) != 1 ||
		out.Restrictions.PredictionLimits[0].Unit != "PTS" ||
		out.Restrictions.PredictionLimits[0].LimitPointsCents != 700 {
		t.Fatalf("restrictions should expose prediction aliases, got %+v", out.Restrictions.PredictionLimits)
	}
	if len(out.Restrictions.DepositLimits) != 1 || out.Restrictions.DepositLimits[0].LimitCents != 1200 {
		t.Fatalf("legacy depositLimits compatibility field should remain, got %+v", out.Restrictions.DepositLimits)
	}
	if len(out.Restrictions.BetLimits) != 1 || out.Restrictions.BetLimits[0].LimitCents != 700 {
		t.Fatalf("legacy betLimits compatibility field should remain, got %+v", out.Restrictions.BetLimits)
	}

	rec = request(http.MethodGet, "/api/v1/compliance/rg/check-point-use?userId=u-victim&amountPointsCents=100", "", "u-attacker")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-user check-point-use must be 403, got %d (%s)", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, "/api/v1/compliance/rg/check-prediction?userId=u-victim&amountPointsCents=100", "", "u-attacker")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-user check-prediction must be 403, got %d (%s)", rec.Code, rec.Body.String())
	}
}

// LC-22 / D-6 parity: the KYC verify + submit-document mutations also took a
// body userId. Now that the player UI drives a real verification flow, an
// attacker must not be able to verify/submit on another user's behalf.
func TestKYCMutations_SessionBound(t *testing.T) {
	newStack := func() *http.ServeMux {
		mux := http.NewServeMux()
		registerKYCRoutes(mux, NewMockKYCService(), nil)
		return mux
	}
	post := func(mux *http.ServeMux, path, body, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if sessionUID != "" {
			req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		}
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}
	status := func(mux *http.ServeMux, uid string) string {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/compliance/kyc/status?userId="+uid, nil)
		req = req.WithContext(httpx.WithTestUser(context.Background(), uid, uid, "player"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		var out struct {
			Status struct {
				Status string `json:"status"`
			} `json:"status"`
		}
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		return out.Status.Status
	}

	t.Run("cross-user verify is forbidden, victim stays unverified", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/kyc/verify",
			`{"userId":"u-victim","documents":[{"type":"passport"}]}`, "u-attacker")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("cross-user kyc/verify must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
		if s := status(mux, "u-victim"); s != "unverified" {
			t.Fatalf("victim must remain unverified, got %q", s)
		}
	})

	t.Run("self verify succeeds", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/kyc/verify",
			`{"userId":"u-self","documents":[{"type":"passport"}]}`, "u-self")
		if rec.Code != http.StatusOK {
			t.Fatalf("self kyc/verify must be 200, got %d (%s)", rec.Code, rec.Body.String())
		}
		if s := status(mux, "u-self"); s != "approved" {
			t.Fatalf("self verify must approve (mock), got %q", s)
		}
	})

	t.Run("cross-user submit-document is forbidden", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/kyc/submit-document",
			`{"userId":"u-victim","type":"passport"}`, "u-attacker")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("cross-user submit-document must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
	})

	t.Run("unauthenticated verify is forbidden", func(t *testing.T) {
		mux := newStack()
		rec := post(mux, "/api/v1/compliance/kyc/verify",
			`{"userId":"u-x","documents":[{"type":"passport"}]}`, "")
		if rec.Code != http.StatusForbidden {
			t.Fatalf("no-session kyc/verify must be 403, got %d (%s)", rec.Code, rec.Body.String())
		}
	})
}

// GET-disclosure residual (2026-05-17): the RG/KYC *read* endpoints
// historically trusted an arbitrary ?userId=, so any authenticated user
// could enumerate another user's compliance state (limits + usage, KYC
// status/documents, restrictions). They must now be session-bound like the
// D-6 mutations: a mismatched ?userId= is 403 with no data; an absent one
// defaults to the session user; no session is 403.
func TestRGKYCReads_SessionBound(t *testing.T) {
	get := func(mux *http.ServeMux, path, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		if sessionUID != "" {
			req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		}
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}

	rgMux := func() *http.ServeMux {
		mux := http.NewServeMux()
		registerResponsibleGamblingRoutes(mux, NewMockResponsibleGamblingService())
		return mux
	}
	kycMux := func() *http.ServeMux {
		mux := http.NewServeMux()
		registerKYCRoutes(mux, NewMockKYCService(), nil)
		return mux
	}

	// path is split into base + the extra required params so the
	// cross-user case can omit them and still prove the ownership check
	// runs BEFORE param validation.
	cases := []struct {
		name        string
		mux         func() *http.ServeMux
		base, extra string
	}{
		{"rg/restrictions", rgMux, "/api/v1/compliance/rg/restrictions", ""},
		{"rg/bet-limits", rgMux, "/api/v1/compliance/rg/bet-limits", ""},
		{"rg/prediction-limits", rgMux, "/api/v1/compliance/rg/prediction-limits", ""},
		{"rg/point-use-limits", rgMux, "/api/v1/compliance/rg/point-use-limits", ""},
		{"rg/deposit-limits", rgMux, "/api/v1/compliance/rg/deposit-limits", ""},
		{"rg/check-point-use", rgMux, "/api/v1/compliance/rg/check-point-use", "&amountPointsCents=100"},
		{"rg/check-prediction", rgMux, "/api/v1/compliance/rg/check-prediction", "&amountPointsCents=100"},
		{"rg/check-bet", rgMux, "/api/v1/compliance/rg/check-bet", "&stakeCents=100"},
		{"rg/check-deposit", rgMux, "/api/v1/compliance/rg/check-deposit", "&amountCents=100"},
		{"kyc/status", kycMux, "/api/v1/compliance/kyc/status", ""},
		{"kyc/documents", kycMux, "/api/v1/compliance/kyc/documents", ""},
	}

	for _, tc := range cases {
		t.Run(tc.name+" cross-user is forbidden and leaks nothing", func(t *testing.T) {
			mux := tc.mux()
			rec := get(mux, tc.base+"?userId=u-victim"+tc.extra, "u-attacker")
			if rec.Code != http.StatusForbidden {
				t.Fatalf("cross-user read must be 403, got %d (%s)", rec.Code, rec.Body.String())
			}
			if !strings.Contains(rec.Body.String(), "cannot access another user's") {
				t.Fatalf("expected ownership rejection, got %s", rec.Body.String())
			}
			// A 200 response echoes "userId":"u-victim"; a correct 403
			// must not carry the victim id back at all.
			if strings.Contains(rec.Body.String(), "u-victim") {
				t.Fatalf("403 body must not echo the victim userId: %s", rec.Body.String())
			}
		})

		t.Run(tc.name+" own session succeeds", func(t *testing.T) {
			mux := tc.mux()
			rec := get(mux, tc.base+"?userId=u-self"+tc.extra, "u-self")
			if rec.Code != http.StatusOK {
				t.Fatalf("own read must be 200, got %d (%s)", rec.Code, rec.Body.String())
			}
		})

		t.Run(tc.name+" absent userId defaults to session", func(t *testing.T) {
			mux := tc.mux()
			q := ""
			if tc.extra != "" {
				q = "?" + tc.extra[1:] // drop the leading '&'
			}
			rec := get(mux, tc.base+q, "u-self")
			if rec.Code != http.StatusOK {
				t.Fatalf("absent-userId read must be 200 (session user), got %d (%s)", rec.Code, rec.Body.String())
			}
		})

		t.Run(tc.name+" unauthenticated is forbidden", func(t *testing.T) {
			mux := tc.mux()
			rec := get(mux, tc.base+"?userId=u-x"+tc.extra, "")
			if rec.Code != http.StatusForbidden {
				t.Fatalf("no-session read must be 403, got %d (%s)", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestKYCReads_RedactLegacyUnsafeReasonsOnRead(t *testing.T) {
	service := NewMockKYCService()
	service.statuses["u-self"] = &KYCStatus{
		UserID:             "u-self",
		Status:             "declined",
		RiskLevel:          "high",
		DocumentsSubmitted: []string{"passport"},
		RejectionReasons:   []string{"cash payout document mismatch"},
	}
	service.documents["u-self"] = []VerificationDocument{
		{
			ID:           "doc:1",
			UserID:       "u-self",
			Type:         "passport",
			Status:       "rejected",
			RejectReason: "crypto payout document issue",
		},
	}

	mux := http.NewServeMux()
	registerKYCRoutes(mux, service, nil)
	get := func(path string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req = req.WithContext(httpx.WithTestUser(context.Background(), "u-self", "u-self", "player"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}

	statusRec := get("/api/v1/compliance/kyc/status?userId=u-self")
	if statusRec.Code != http.StatusOK {
		t.Fatalf("status read must be 200, got %d (%s)", statusRec.Code, statusRec.Body.String())
	}
	if service.statuses["u-self"].RejectionReasons[0] != "cash payout document mismatch" {
		t.Fatalf("raw KYC rejection reason should remain available for review, got %+v", service.statuses["u-self"])
	}
	if strings.Contains(statusRec.Body.String(), "cash payout") {
		t.Fatalf("KYC status response leaked unsafe rejection reason: %s", statusRec.Body.String())
	}
	if !strings.Contains(statusRec.Body.String(), launchRedactedComplianceText) {
		t.Fatalf("KYC status response should include redacted reason, got %s", statusRec.Body.String())
	}

	docsRec := get("/api/v1/compliance/kyc/documents?userId=u-self")
	if docsRec.Code != http.StatusOK {
		t.Fatalf("documents read must be 200, got %d (%s)", docsRec.Code, docsRec.Body.String())
	}
	if service.documents["u-self"][0].RejectReason != "crypto payout document issue" {
		t.Fatalf("raw KYC document reject reason should remain available for review, got %+v", service.documents["u-self"][0])
	}
	if strings.Contains(docsRec.Body.String(), "crypto payout") {
		t.Fatalf("KYC documents response leaked unsafe reject reason: %s", docsRec.Body.String())
	}
	if !strings.Contains(docsRec.Body.String(), launchRedactedComplianceText) {
		t.Fatalf("KYC documents response should include redacted reason, got %s", docsRec.Body.String())
	}
}
