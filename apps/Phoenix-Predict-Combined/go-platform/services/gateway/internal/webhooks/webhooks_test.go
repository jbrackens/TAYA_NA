package webhooks

import (
	"context"
	"encoding/json"
	"io"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestSignVerifyRoundTrip(t *testing.T) {
	body := []byte(`{"id":"d1","type":"order.filled"}`)
	sig := Sign("s3cret", body)
	if !strings.HasPrefix(sig, "sha256=") {
		t.Fatalf("signature should be prefixed sha256=, got %q", sig)
	}
	if !Verify("s3cret", body, sig) {
		t.Fatal("verify should pass for matching secret + body")
	}
	if Verify("wrong-secret", body, sig) {
		t.Fatal("verify should fail for a wrong secret")
	}
	if Verify("s3cret", []byte(`{"tampered":true}`), sig) {
		t.Fatal("verify should fail for a tampered body")
	}
}

func TestDeliverClassifiesStatus(t *testing.T) {
	cases := map[int]DeliveryOutcome{
		200: Delivered, 201: Delivered, 204: Delivered,
		500: Retryable, 502: Retryable, 503: Retryable, 429: Retryable, 408: Retryable,
		400: Permanent, 401: Permanent, 403: Permanent, 404: Permanent, 422: Permanent,
	}
	for status, want := range cases {
		status, want := status, want
		srv := httptest.NewServer(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, _ *stdhttp.Request) {
			w.WriteHeader(status)
		}))
		ep := Endpoint{URL: srv.URL, Secret: "s", Active: true}
		got, code, err := Deliver(context.Background(), srv.Client(), ep, Event{ID: "d1", Type: EventOrderFilled})
		srv.Close()
		if err != nil {
			t.Fatalf("status %d: unexpected err %v", status, err)
		}
		if got != want {
			t.Fatalf("status %d: outcome %v, want %v", status, got, want)
		}
		if code != status {
			t.Fatalf("status %d: returned code %d", status, code)
		}
	}
}

func TestDeliverSignsAndSetsHeaders(t *testing.T) {
	var gotSig, gotEvent, gotID, gotCT string
	var gotBody []byte
	srv := httptest.NewServer(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		gotSig = r.Header.Get(SignatureHeader)
		gotEvent = r.Header.Get(EventHeader)
		gotID = r.Header.Get(DeliveryIDHeader)
		gotCT = r.Header.Get("Content-Type")
		gotBody, _ = io.ReadAll(r.Body)
		w.WriteHeader(stdhttp.StatusOK)
	}))
	defer srv.Close()

	ep := Endpoint{URL: srv.URL, Secret: "shh", Active: true}
	ev := Event{ID: "d-42", Type: EventMarketSettled, Data: json.RawMessage(`{"marketId":"m1"}`)}
	if _, _, err := Deliver(context.Background(), srv.Client(), ep, ev); err != nil {
		t.Fatalf("deliver: %v", err)
	}
	if gotEvent != EventMarketSettled || gotID != "d-42" || gotCT != "application/json" {
		t.Fatalf("headers: event=%q id=%q ct=%q", gotEvent, gotID, gotCT)
	}
	// The receiver must be able to verify the signature over the exact body.
	if !Verify("shh", gotBody, gotSig) {
		t.Fatal("receiver could not verify the delivered signature")
	}
}

// TestRetryLoopDeliversAfterTransient5xx is the P3-03 acceptance core: a flaky
// receiver that 5xxs twice then 2xxs is retried and eventually delivered. (The
// real dispatcher sleeps Backoff(attempt) between attempts + persists state; the
// engine primitive supports exactly this retry-on-Retryable loop.)
func TestRetryLoopDeliversAfterTransient5xx(t *testing.T) {
	attempts := 0
	srv := httptest.NewServer(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, _ *stdhttp.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(stdhttp.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(stdhttp.StatusOK)
	}))
	defer srv.Close()

	ep := Endpoint{URL: srv.URL, Secret: "s", Active: true}
	ev := Event{ID: "d1", Type: EventOrderFilled}
	delivered := false
	for attempt := 1; attempt <= 5; attempt++ {
		out, _, _ := Deliver(context.Background(), srv.Client(), ep, ev)
		if out == Delivered {
			delivered = true
			break
		}
		if out == Permanent {
			break
		}
	}
	if !delivered || attempts != 3 {
		t.Fatalf("expected delivery on attempt 3; delivered=%v attempts=%d", delivered, attempts)
	}
}

func TestBackoffExponentialCapped(t *testing.T) {
	base, max := 1*time.Second, 30*time.Second
	want := []time.Duration{1, 2, 4, 8, 16, 30, 30}
	for i, w := range want {
		got := Backoff(i+1, base, max)
		if got != w*time.Second {
			t.Fatalf("attempt %d: backoff %v, want %v", i+1, got, w*time.Second)
		}
	}
}

func TestEndpointWants(t *testing.T) {
	all := Endpoint{Active: true} // empty Events = subscribe-all
	if !all.Wants(EventOrderFilled) || !all.Wants(EventMarketSettled) {
		t.Fatal("subscribe-all endpoint should want every event")
	}
	sel := Endpoint{Active: true, Events: []string{EventMarketSettled}}
	if sel.Wants(EventOrderFilled) || !sel.Wants(EventMarketSettled) {
		t.Fatal("selective endpoint should only want subscribed events")
	}
	if (Endpoint{Active: false}).Wants(EventOrderFilled) {
		t.Fatal("inactive endpoint should want nothing")
	}
}
