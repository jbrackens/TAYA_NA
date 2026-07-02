package surveillance

import (
	"encoding/json"
	"errors"
)

var (
	ErrNotFound           = errors.New("not found")
	ErrInvalidInput       = errors.New("invalid input")
	ErrResolutionRequired = errors.New("a resolution is required to close a case")
	ErrCaseClosed         = errors.New("case is already closed and cannot be changed")
)

var validCaseStatus = map[string]bool{
	"open":             true,
	"investigating":    true,
	"closed_action":    true,
	"closed_no_action": true,
}

func severityOrDefault(s string) string {
	switch s {
	case "low", "medium", "high":
		return s
	default:
		return "medium"
	}
}

func priorityOrDefault(p string) string {
	switch p {
	case "low", "medium", "high":
		return p
	default:
		return "medium"
	}
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func marshalDetail(d map[string]any) (any, error) {
	if len(d) == 0 {
		return nil, nil
	}
	raw, err := json.Marshal(d)
	if err != nil {
		return nil, err
	}
	return string(raw), nil
}

func unmarshalDetail(s string) map[string]any {
	if s == "" {
		return map[string]any{}
	}
	out := map[string]any{}
	_ = json.Unmarshal([]byte(s), &out)
	return out
}
