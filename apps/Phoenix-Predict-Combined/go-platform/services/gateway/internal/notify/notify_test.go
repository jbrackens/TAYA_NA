package notify

import (
	"context"
	"testing"
)

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
	t.Setenv("NOTIFY_RESOLUTION_TO", " ops@hulana.app , risk@hulana.app ")
	got := ResolutionRecipients()
	if len(got) != 2 || got[0] != "ops@hulana.app" || got[1] != "risk@hulana.app" {
		t.Fatalf("parse failed: %#v", got)
	}
	t.Setenv("NOTIFY_RESOLUTION_TO", "")
	if r := ResolutionRecipients(); r != nil {
		t.Fatalf("empty env should yield nil, got %#v", r)
	}
}
