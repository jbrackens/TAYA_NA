package v1

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrInvalidEnvelope = errors.New("invalid canonical envelope")

type Envelope struct {
	Schema        SchemaInfo      `json:"schema"`
	Provider      ProviderRef     `json:"provider"`
	Stream        StreamType      `json:"stream"`
	Revision      int64           `json:"revision"`
	Sequence      int64           `json:"sequence"`
	Entity        EntityType      `json:"entity"`
	Action        ChangeAction    `json:"action"`
	OccurredAt    time.Time       `json:"occurredAt"`
	CorrelationID string          `json:"correlationId,omitempty"`
	Payload       json.RawMessage `json:"payload"`
}

func NewEnvelope(
	provider ProviderRef,
	stream StreamType,
	revision int64,
	sequence int64,
	entity EntityType,
	action ChangeAction,
	occurredAt time.Time,
	payload any,
) (Envelope, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return Envelope{}, fmt.Errorf("%w: failed to encode payload: %v", ErrInvalidEnvelope, err)
	}

	event := Envelope{
		Schema:     CurrentSchema(),
		Provider:   provider,
		Stream:     stream,
		Revision:   revision,
		Sequence:   sequence,
		Entity:     entity,
		Action:     action,
		OccurredAt: occurredAt.UTC(),
		Payload:    body,
	}
	if err := event.Validate(); err != nil {
		return Envelope{}, err
	}
	return event, nil
}

func (e Envelope) Validate() error {
	if strings.TrimSpace(e.Schema.Name) == "" || strings.TrimSpace(e.Schema.Version) == "" {
		return fmt.Errorf("%w: schema metadata is required", ErrInvalidEnvelope)
	}
	if !IsCompatible(e.Schema.Version) {
		return fmt.Errorf("%w: incompatible schema version: %s", ErrInvalidEnvelope, e.Schema.Version)
	}
	if strings.TrimSpace(e.Provider.Name) == "" {
		return fmt.Errorf("%w: provider name is required", ErrInvalidEnvelope)
	}
	if strings.TrimSpace(string(e.Stream)) == "" {
		return fmt.Errorf("%w: stream is required", ErrInvalidEnvelope)
	}
	if strings.TrimSpace(string(e.Entity)) == "" {
		return fmt.Errorf("%w: entity is required", ErrInvalidEnvelope)
	}
	if strings.TrimSpace(string(e.Action)) == "" {
		return fmt.Errorf("%w: action is required", ErrInvalidEnvelope)
	}
	if e.Revision < 0 {
		return fmt.Errorf("%w: revision must be >= 0", ErrInvalidEnvelope)
	}
	if e.Sequence < 0 {
		return fmt.Errorf("%w: sequence must be >= 0", ErrInvalidEnvelope)
	}
	if e.OccurredAt.IsZero() {
		return fmt.Errorf("%w: occurredAt is required", ErrInvalidEnvelope)
	}
	if len(e.Payload) == 0 {
		return fmt.Errorf("%w: payload is required", ErrInvalidEnvelope)
	}
	return nil
}

func (e Envelope) DecodePayload(target any) error {
	if target == nil {
		return fmt.Errorf("%w: payload target is nil", ErrInvalidEnvelope)
	}
	if len(e.Payload) == 0 {
		return fmt.Errorf("%w: payload is empty", ErrInvalidEnvelope)
	}
	if err := json.Unmarshal(e.Payload, target); err != nil {
		return fmt.Errorf("%w: decode payload: %v", ErrInvalidEnvelope, err)
	}
	return nil
}
