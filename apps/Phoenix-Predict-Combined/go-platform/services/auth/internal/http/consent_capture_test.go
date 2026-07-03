package http

import "testing"

type captureAuditLogger struct {
	events []capturedEvent
}

type capturedEvent struct {
	name   string
	fields map[string]any
}

func (c *captureAuditLogger) Event(name string, fields map[string]any) {
	c.events = append(c.events, capturedEvent{name: name, fields: fields})
}

// TestRegistrationEmitsVersionedConsentEvents (GAP-51, PAM §28) asserts
// registration records each accepted document as a durable, versioned
// consent event (auth.consent.accepted) in the audit trail — the append-only
// consent-capture record §28 requires, carrying the document, version, userId,
// and timestamp of the consent act.
func TestRegistrationEmitsVersionedConsentEvents(t *testing.T) {
	auth := NewAuthService()
	rec := &captureAuditLogger{}
	auth.audit = rec

	if _, err := auth.RegisterWithAcceptance("gap51player", "StrongPass123!", "", "terms-v3", "disclosure-v2"); err != nil {
		t.Fatalf("register: %v", err)
	}

	var terms, disc *capturedEvent
	for i := range rec.events {
		e := &rec.events[i]
		if e.name != "auth.consent.accepted" {
			continue
		}
		switch e.fields["document"] {
		case "terms_of_service":
			terms = e
		case "launch_disclosure":
			disc = e
		}
	}
	if terms == nil || terms.fields["version"] != "terms-v3" {
		t.Fatalf("terms consent event missing/wrong: %+v", rec.events)
	}
	if disc == nil || disc.fields["version"] != "disclosure-v2" {
		t.Fatalf("disclosure consent event missing/wrong: %+v", rec.events)
	}
	if terms.fields["userId"] == "" || terms.fields["acceptedAt"] == "" {
		t.Fatalf("consent event must carry userId + acceptedAt: %+v", terms.fields)
	}
}

// TestRegistrationWithoutConsentEmitsNoConsentEvent confirms no consent event is
// emitted when no document version is provided (nothing to record).
func TestRegistrationWithoutConsentEmitsNoConsentEvent(t *testing.T) {
	auth := NewAuthService()
	rec := &captureAuditLogger{}
	auth.audit = rec

	if _, err := auth.RegisterWithAcceptance("gap51noconsent", "StrongPass123!", "", "", ""); err != nil {
		t.Fatalf("register: %v", err)
	}
	for _, e := range rec.events {
		if e.name == "auth.consent.accepted" {
			t.Fatalf("no consent event expected when no version provided, got %+v", e.fields)
		}
	}
}
