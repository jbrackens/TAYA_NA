package discover

import (
	"encoding/base64"
	"fmt"
	"strings"
)

// encodeCursor packs (volume, id) so List() can resume past a tie-breaking
// (volume, id) tuple. Opaque to clients — never write the source name or
// upstream id into this string.
func encodeCursor(volume float64, id string) string {
	raw := fmt.Sprintf("%f|%s", volume, id)
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

func decodeCursor(s string) (float64, string, bool) {
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return 0, "", false
	}
	parts := strings.SplitN(string(b), "|", 2)
	if len(parts) != 2 {
		return 0, "", false
	}
	var v float64
	if _, err := fmt.Sscanf(parts[0], "%f", &v); err != nil {
		return 0, "", false
	}
	if parts[1] == "" {
		return 0, "", false
	}
	return v, parts[1], true
}
