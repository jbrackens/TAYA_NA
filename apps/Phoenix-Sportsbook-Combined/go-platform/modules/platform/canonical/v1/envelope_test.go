package v1

import (
	"errors"
	"testing"
	"time"
)

func TestNewEnvelopeAndDecodePayload(t *testing.T) {
	now := time.Date(2026, 3, 4, 10, 0, 0, 0, time.UTC)
	payload := Fixture{
		FixtureID: "fix-1",
		SportID:   "sport-1",
		Name:      "Team A vs Team B",
		StartsAt:  now.Add(2 * time.Hour),
		Status:    FixtureStatusScheduled,
		UpdatedAt: now,
	}

	event, err := NewEnvelope(
		ProviderRef{Name: "odds88", Feed: "delta"},
		StreamDelta,
		100,
		15,
		EntityFixture,
		ActionUpsert,
		now,
		payload,
	)
	if err != nil {
		t.Fatalf("expected envelope creation to succeed, got error: %v", err)
	}

	var decoded Fixture
	if err := event.DecodePayload(&decoded); err != nil {
		t.Fatalf("expected payload decode to succeed, got error: %v", err)
	}
	if decoded.FixtureID != payload.FixtureID {
		t.Fatalf("expected fixture id %q, got %q", payload.FixtureID, decoded.FixtureID)
	}
	if decoded.Status != FixtureStatusScheduled {
		t.Fatalf("expected fixture status %q, got %q", FixtureStatusScheduled, decoded.Status)
	}
}

func TestEnvelopeValidateRejectsInvalidEnvelope(t *testing.T) {
	event := Envelope{
		Schema:     CurrentSchema(),
		Provider:   ProviderRef{},
		Stream:     StreamDelta,
		Revision:   1,
		Sequence:   1,
		Entity:     EntityFixture,
		Action:     ActionUpsert,
		OccurredAt: time.Now().UTC(),
		Payload:    []byte(`{}`),
	}

	err := event.Validate()
	if err == nil {
		t.Fatal("expected validation to fail for missing provider name")
	}
	if !errors.Is(err, ErrInvalidEnvelope) {
		t.Fatalf("expected ErrInvalidEnvelope, got: %v", err)
	}
}

func TestEnvelopeValidateRejectsIncompatibleSchema(t *testing.T) {
	event := Envelope{
		Schema: SchemaInfo{
			Name:    SchemaName,
			Version: "2.0.0",
			Major:   2,
			Minor:   0,
			Patch:   0,
		},
		Provider:   ProviderRef{Name: "odds88"},
		Stream:     StreamDelta,
		Revision:   1,
		Sequence:   1,
		Entity:     EntityFixture,
		Action:     ActionUpsert,
		OccurredAt: time.Now().UTC(),
		Payload:    []byte(`{"fixtureId":"f-1"}`),
	}

	err := event.Validate()
	if err == nil {
		t.Fatal("expected validation to fail for incompatible schema version")
	}
	if !errors.Is(err, ErrInvalidEnvelope) {
		t.Fatalf("expected ErrInvalidEnvelope, got: %v", err)
	}
}
