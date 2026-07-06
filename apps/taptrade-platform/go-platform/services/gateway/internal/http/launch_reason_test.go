package http

import (
	"errors"
	stdhttp "net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"taptrade/gateway/internal/rbac"
	"taptrade/platform/transport/httpx"
)

func TestRedactLaunchProhibitedUserText(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "unsafe money wording",
			in:   "cash payout available",
			want: launchRedactedUserText,
		},
		{
			name: "unsafe redeemable wording",
			in:   "redeemable rank reward",
			want: launchRedactedUserText,
		},
		{
			name: "allowed non redeemable disclosure",
			in:   "non-redeemable point status only",
			want: "non-redeemable point status only",
		},
		{
			name: "safe point wording",
			in:   "points-only status boost",
			want: "points-only status boost",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := redactLaunchProhibitedUserText(tt.in); got != tt.want {
				t.Fatalf("redactLaunchProhibitedUserText(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestServiceBadRequestErrorRedactsMessageAndPreservesDetails(t *testing.T) {
	err := serviceBadRequestError(
		errors.New("cash payout validation failed"),
		map[string]any{"field": "url"},
	)
	appErr := httpx.FromError(err)
	if appErr == nil {
		t.Fatal("expected app error")
	}
	if appErr.Status != stdhttp.StatusBadRequest {
		t.Fatalf("status = %d, want %d", appErr.Status, stdhttp.StatusBadRequest)
	}
	if appErr.Message != launchRedactedUserText {
		t.Fatalf("message = %q", appErr.Message)
	}
	details, ok := appErr.Details.(map[string]any)
	if !ok {
		t.Fatalf("details should be preserved as a map, got %#v", appErr.Details)
	}
	if details["field"] != "url" {
		t.Fatalf("field detail = %#v", details["field"])
	}
}

func TestWriteRBACErrorRedactsValidationMessage(t *testing.T) {
	err := writeRBACError(rbac.ValidationError{Msg: "cash payout role is not allowed"})
	appErr := httpx.FromError(err)
	if appErr == nil {
		t.Fatal("expected app error")
	}
	if appErr.Status != stdhttp.StatusBadRequest {
		t.Fatalf("status = %d, want %d", appErr.Status, stdhttp.StatusBadRequest)
	}
	if appErr.Message != launchRedactedUserText {
		t.Fatalf("message = %q", appErr.Message)
	}
}

func TestGatewayHTTPHandlersDoNotEchoRawServiceErrors(t *testing.T) {
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatalf("glob handler sources: %v", err)
	}
	if len(files) == 0 {
		t.Fatal("expected handler source files")
	}

	forbidden := []*regexp.Regexp{
		regexp.MustCompile(`httpx\.(BadRequest|Conflict|NotFound|Forbidden)\s*\(\s*err\.Error\(\)`),
		regexp.MustCompile(`stdhttp\.Error\s*\(\s*w\s*,\s*err\.Error\(\)`),
		regexp.MustCompile(`"error"\s*:\s*err\.Error\(\)`),
		regexp.MustCompile(`"error"\s*:\s*errMsg\b`),
	}

	var failures []string
	for _, file := range files {
		if strings.HasSuffix(file, "_test.go") {
			continue
		}
		body, err := os.ReadFile(file)
		if err != nil {
			t.Fatalf("read %s: %v", file, err)
		}
		source := string(body)
		for _, pattern := range forbidden {
			if pattern.MatchString(source) {
				failures = append(failures, file+": "+pattern.String())
			}
		}
	}
	if len(failures) > 0 {
		t.Fatalf("gateway HTTP handlers must redact or replace raw service errors before serialization:\n%s", strings.Join(failures, "\n"))
	}
}
