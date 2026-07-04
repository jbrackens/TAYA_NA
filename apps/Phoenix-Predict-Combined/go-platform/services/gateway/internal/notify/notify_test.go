package notify

import (
	"context"
	"strings"
	"testing"
)

// TestBuildMessageStripsHeaderInjection (verification #22 HIGH): a CR/LF embedded
// in the subject or a recipient — e.g. from rendered template data — must NOT
// spawn extra email headers (SMTP header / CRLF injection). It is folded onto the
// single header line instead.
func TestBuildMessageStripsHeaderInjection(t *testing.T) {
	msg := string(buildMessage(
		"from@x",
		[]string{"to@x\r\nBcc: sneaky@evil.example"},
		"Hi\r\nBcc: evil@evil.example\r\nX-Injected: 1",
		"line one\r\nline two",
	))

	// No injected header line: neither Bcc nor X-Injected may begin a line.
	for _, injected := range []string{"\nBcc:", "\nX-Injected:"} {
		if strings.Contains(msg, injected) {
			t.Fatalf("header injection not stripped (found %q):\n%s", injected, msg)
		}
	}
	// The subject collapses to a single line with the CR/LF removed.
	if !strings.Contains(msg, "Subject: HiBcc: evil@evil.exampleX-Injected: 1\r\n") {
		t.Fatalf("subject not sanitized to one line:\n%s", msg)
	}
	// The recipient CR/LF is stripped too.
	if !strings.Contains(msg, "To: to@xBcc: sneaky@evil.example\r\n") {
		t.Fatalf("recipient not sanitized:\n%s", msg)
	}
	// The body is preserved verbatim (it sits after the header/body separator and
	// is dot-stuffed by net/smtp, so its newlines are legitimate content).
	if !strings.Contains(msg, "line one\r\nline two") {
		t.Fatalf("body should be preserved verbatim:\n%s", msg)
	}
}

func TestNewFromEnv_DefaultsToLog(t *testing.T) {
	t.Setenv("SMTP_HOST", "")
	if n := NewFromEnv(); n.Name() != "log" {
		t.Fatalf("unset SMTP_HOST should yield log transport, got %q", n.Name())
	}
}

func TestNewFromEnv_SMTPWhenConfigured(t *testing.T) {
	t.Setenv("SMTP_HOST", "smtp.example.com")
	if n := NewFromEnv(); n.Name() != "smtp" {
		t.Fatalf("SMTP_HOST set should yield smtp transport, got %q", n.Name())
	}
}

func TestLogNotifier_NeverErrors(t *testing.T) {
	if err := (LogNotifier{}).Notify(context.Background(), []string{"a@b.com"}, "subj", "body"); err != nil {
		t.Fatalf("log notifier should not error: %v", err)
	}
}

func TestResolutionRecipients(t *testing.T) {
	t.Setenv("NOTIFY_RESOLUTION_TO", " ops@tiangge.app , risk@tiangge.app ")
	got := ResolutionRecipients()
	if len(got) != 2 || got[0] != "ops@tiangge.app" || got[1] != "risk@tiangge.app" {
		t.Fatalf("parse failed: %#v", got)
	}
	t.Setenv("NOTIFY_RESOLUTION_TO", "")
	if r := ResolutionRecipients(); r != nil {
		t.Fatalf("empty env should yield nil, got %#v", r)
	}
}
