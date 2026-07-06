package discover

import (
	"encoding/json"
	"fmt"
	"io"
	"time"
)

// jsonUnmarshal is a thin alias used by ratelimit.go's cache path — keeps
// the package's JSON decode behavior in one place.
func jsonUnmarshal(body []byte, out any) error {
	return json.Unmarshal(body, out)
}

// readAllLimited reads up to limit bytes from r. Used to bound hostile or
// runaway response sizes.
func readAllLimited(r io.Reader, limit int64) ([]byte, error) {
	return io.ReadAll(io.LimitReader(r, limit))
}

func toFloat(v any) float64 {
	switch x := v.(type) {
	case float64:
		return x
	case float32:
		return float64(x)
	case int:
		return float64(x)
	case int64:
		return float64(x)
	case json.Number:
		f, _ := x.Float64()
		return f
	case string:
		var f float64
		_, _ = fmt.Sscanf(x, "%f", &f)
		return f
	}
	return 0
}

func parseISO(v any) *time.Time {
	s, ok := v.(string)
	if !ok || s == "" {
		return nil
	}
	for _, layout := range []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05.000Z",
	} {
		if t, err := time.Parse(layout, s); err == nil {
			return &t
		}
	}
	return nil
}

func msToTime(v any) *time.Time {
	f := toFloat(v)
	if f == 0 {
		return nil
	}
	t := time.UnixMilli(int64(f)).UTC()
	return &t
}

func firstNonNil(values ...any) any {
	for _, v := range values {
		switch x := v.(type) {
		case nil:
			continue
		case string:
			if x == "" {
				continue
			}
		}
		return v
	}
	return nil
}

func firstTime(values ...any) *time.Time {
	for _, v := range values {
		if t := parseISO(v); t != nil {
			return t
		}
		if t := msToTime(v); t != nil {
			return t
		}
	}
	return nil
}

func firstFloat(values ...any) float64 {
	for _, v := range values {
		if f := toFloat(v); f != 0 {
			return f
		}
	}
	return 0
}

func firstString(values ...any) string {
	for _, v := range values {
		if s := strs(v); s != "" {
			return s
		}
	}
	return ""
}

func compactStrings(values ...string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, v := range values {
		if v == "" || seen[v] {
			continue
		}
		seen[v] = true
		out = append(out, v)
	}
	return out
}

func stringSlice(v any) []string {
	switch x := v.(type) {
	case []string:
		return compactStrings(x...)
	case []any:
		out := make([]string, 0, len(x))
		for _, item := range x {
			if s := strs(item); s != "" {
				out = append(out, s)
			}
		}
		return compactStrings(out...)
	}
	return nil
}

func manifoldStatus(m map[string]any) string {
	if resolved, _ := m["isResolved"].(bool); resolved {
		return "resolved"
	}
	if t := msToTime(m["closeTime"]); t != nil && t.Before(time.Now().UTC()) {
		return "closed"
	}
	return "open"
}
