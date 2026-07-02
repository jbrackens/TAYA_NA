package compliance

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// The manual default must never auto-clear (P0-4 fail-closed contract).
func TestManualReviewPersonScreenerNeverClears(t *testing.T) {
	res, err := NewManualReviewPersonScreener().ScreenPerson(context.Background(), SanctionsSubject{FullName: "Anyone"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Status != PersonScreeningPotentialMatch {
		t.Fatalf("manual screener returned %q, want potential_match", res.Status)
	}
}

// stubYente serves a canned /match response and captures the request.
func stubYente(t *testing.T, status int, response string) (*httptest.Server, *yenteMatchRequest, *string) {
	t.Helper()
	var captured yenteMatchRequest
	var path string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path = r.URL.Path
		_ = json.NewDecoder(r.Body).Decode(&captured)
		w.WriteHeader(status)
		_, _ = w.Write([]byte(response))
	}))
	t.Cleanup(srv.Close)
	return srv, &captured, &path
}

func TestYenteScreenerVerdictMapping(t *testing.T) {
	cases := []struct {
		name       string
		response   string
		wantStatus PersonScreeningStatus
		wantScore  float64
	}{
		{
			"provider match flag wins",
			`{"responses":{"q":{"results":[{"id":"Q1","score":0.92,"match":true},{"id":"Q2","score":0.4,"match":false}]}}}`,
			PersonScreeningHit, 0.92,
		},
		{
			"score above threshold needs review",
			`{"responses":{"q":{"results":[{"id":"Q3","score":0.61,"match":false}]}}}`,
			PersonScreeningPotentialMatch, 0.61,
		},
		{
			"low scores clear",
			`{"responses":{"q":{"results":[{"id":"Q4","score":0.2,"match":false}]}}}`,
			PersonScreeningClear, 0.2,
		},
		{
			"no candidates clear",
			`{"responses":{"q":{"results":[]}}}`,
			PersonScreeningClear, 0,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			srv, _, _ := stubYente(t, http.StatusOK, tc.response)
			s := NewYenteScreener(srv.URL, "default", 0.5, srv.Client())
			res, err := s.ScreenPerson(context.Background(), SanctionsSubject{FullName: "Jane Doe"})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if res.Status != tc.wantStatus {
				t.Fatalf("status = %q, want %q", res.Status, tc.wantStatus)
			}
			if res.Score != tc.wantScore {
				t.Fatalf("score = %v, want %v", res.Score, tc.wantScore)
			}
		})
	}
}

func TestYenteScreenerRequestShape(t *testing.T) {
	srv, captured, path := stubYente(t, http.StatusOK, `{"responses":{"q":{"results":[]}}}`)
	s := NewYenteScreener(srv.URL, "default", 0.5, srv.Client())
	_, err := s.ScreenPerson(context.Background(), SanctionsSubject{
		FullName: "Jane Doe", DateOfBirth: "1980-02-01", Country: "ph",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if *path != "/match/default" {
		t.Fatalf("path = %q, want /match/default", *path)
	}
	q, ok := captured.Queries["q"]
	if !ok {
		t.Fatalf("query 'q' missing: %+v", captured)
	}
	if q.Schema != "Person" {
		t.Fatalf("schema = %q, want Person", q.Schema)
	}
	if len(q.Properties.Name) != 1 || q.Properties.Name[0] != "Jane Doe" {
		t.Fatalf("name = %v", q.Properties.Name)
	}
	if len(q.Properties.BirthDate) != 1 || q.Properties.BirthDate[0] != "1980-02-01" {
		t.Fatalf("birthDate = %v", q.Properties.BirthDate)
	}
	if len(q.Properties.Country) != 1 || q.Properties.Country[0] != "ph" {
		t.Fatalf("country = %v", q.Properties.Country)
	}
}

// Every failure path must resolve to unavailable + error — never clear.
func TestYenteScreenerFailsClosed(t *testing.T) {
	t.Run("non-200", func(t *testing.T) {
		srv, _, _ := stubYente(t, http.StatusBadGateway, `oops`)
		s := NewYenteScreener(srv.URL, "default", 0.5, srv.Client())
		res, err := s.ScreenPerson(context.Background(), SanctionsSubject{FullName: "Jane Doe"})
		if err == nil || res.Status != PersonScreeningUnavailable {
			t.Fatalf("want unavailable+err, got (%q, %v)", res.Status, err)
		}
	})
	t.Run("malformed body", func(t *testing.T) {
		srv, _, _ := stubYente(t, http.StatusOK, `{not json`)
		s := NewYenteScreener(srv.URL, "default", 0.5, srv.Client())
		res, err := s.ScreenPerson(context.Background(), SanctionsSubject{FullName: "Jane Doe"})
		if err == nil || res.Status != PersonScreeningUnavailable {
			t.Fatalf("want unavailable+err, got (%q, %v)", res.Status, err)
		}
	})
	t.Run("missing query key", func(t *testing.T) {
		srv, _, _ := stubYente(t, http.StatusOK, `{"responses":{}}`)
		s := NewYenteScreener(srv.URL, "default", 0.5, srv.Client())
		res, err := s.ScreenPerson(context.Background(), SanctionsSubject{FullName: "Jane Doe"})
		if err == nil || res.Status != PersonScreeningUnavailable {
			t.Fatalf("want unavailable+err, got (%q, %v)", res.Status, err)
		}
	})
	t.Run("transport error", func(t *testing.T) {
		srv, _, _ := stubYente(t, http.StatusOK, `{}`)
		srv.Close() // connection refused
		s := NewYenteScreener(srv.URL, "default", 0.5, nil)
		res, err := s.ScreenPerson(context.Background(), SanctionsSubject{FullName: "Jane Doe"})
		if err == nil || res.Status != PersonScreeningUnavailable {
			t.Fatalf("want unavailable+err, got (%q, %v)", res.Status, err)
		}
	})
	t.Run("empty subject name", func(t *testing.T) {
		s := NewYenteScreener("http://127.0.0.1:1", "default", 0.5, nil)
		res, err := s.ScreenPerson(context.Background(), SanctionsSubject{})
		if err == nil || res.Status != PersonScreeningUnavailable {
			t.Fatalf("want unavailable+err, got (%q, %v)", res.Status, err)
		}
	})
}

// Env selection fails closed on misconfiguration.
func TestPersonScreenerFromEnv(t *testing.T) {
	isManual := func(s PersonScreener) bool {
		_, ok := s.(manualReviewPersonScreener)
		return ok
	}
	t.Run("default manual", func(t *testing.T) {
		t.Setenv("SANCTIONS_SCREENER", "")
		if !isManual(PersonScreenerFromEnv()) {
			t.Fatal("empty mode must select the manual screener")
		}
	})
	t.Run("explicit off is nil", func(t *testing.T) {
		t.Setenv("SANCTIONS_SCREENER", "off")
		if PersonScreenerFromEnv() != nil {
			t.Fatal("off must return nil")
		}
	})
	t.Run("yente selected", func(t *testing.T) {
		t.Setenv("SANCTIONS_SCREENER", "yente")
		t.Setenv("SANCTIONS_YENTE_URL", "http://localhost:8000")
		if _, ok := PersonScreenerFromEnv().(*YenteScreener); !ok {
			t.Fatal("yente mode must select YenteScreener")
		}
	})
	t.Run("yente without URL fails closed to manual", func(t *testing.T) {
		t.Setenv("SANCTIONS_SCREENER", "yente")
		t.Setenv("SANCTIONS_YENTE_URL", "")
		if !isManual(PersonScreenerFromEnv()) {
			t.Fatal("yente without URL must fall back to manual (fail-closed)")
		}
	})
	t.Run("unknown mode fails closed to manual", func(t *testing.T) {
		t.Setenv("SANCTIONS_SCREENER", "banana")
		if !isManual(PersonScreenerFromEnv()) {
			t.Fatal("unknown mode must fall back to manual (fail-closed)")
		}
	})
}
