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
