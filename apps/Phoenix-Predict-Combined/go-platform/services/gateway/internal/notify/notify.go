// Package notify delivers out-of-band transactional notifications (market
// resolution, payouts, disputes) over channels that reach users even when they
// are not connected to the in-app WebSocket. Today the channel is email; the
// Notifier interface keeps SMS/push a drop-in addition.
package notify

import (
	"context"
	"fmt"
	"log/slog"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// Notifier delivers a single notification. Implementations must be safe to call
// from a post-commit goroutine and must respect the supplied context deadline.
type Notifier interface {
	Name() string
	Notify(ctx context.Context, to []string, subject, body string) error
}

// LogNotifier is the safe default when no email transport is configured: it
// records the notification via structured logging instead of dropping it. This
// is a complete, working channel for dev / unconfigured deployments — set
// SMTP_HOST to switch to real email delivery.
type LogNotifier struct{}

// Name identifies the log transport.
func (LogNotifier) Name() string { return "log" }

// Notify records the notification to the structured log.
func (LogNotifier) Notify(_ context.Context, to []string, subject, body string) error {
	slog.Info("notify (log transport — set SMTP_HOST for email)",
		"to", strings.Join(to, ","), "subject", subject, "body", body)
	return nil
}

// SMTPNotifier sends email via a configured SMTP relay. Wired-but-unconfigured
// until SMTP_HOST is set; NewFromEnv falls back to LogNotifier otherwise.
type SMTPNotifier struct {
	host, port, user, pass, from string
}

// Name identifies the SMTP transport.
func (SMTPNotifier) Name() string { return "smtp" }

// Notify sends an email. Runs the (blocking) SMTP send in a goroutine and
// honors ctx so a stuck relay cannot leak the caller's goroutine.
func (s SMTPNotifier) Notify(ctx context.Context, to []string, subject, body string) error {
	if len(to) == 0 {
		return nil
	}
	addr := s.host + ":" + s.port
	msg := buildMessage(s.from, to, subject, body)
	var auth smtp.Auth
	if s.user != "" {
		auth = smtp.PlainAuth("", s.user, s.pass, s.host)
	}
	done := make(chan error, 1)
	go func() { done <- smtp.SendMail(addr, auth, s.from, to, msg) }()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-done:
		return err
	}
}

func buildMessage(from string, to []string, subject, body string) []byte {
	var b strings.Builder
	fmt.Fprintf(&b, "From: %s\r\n", from)
	fmt.Fprintf(&b, "To: %s\r\n", strings.Join(to, ", "))
	fmt.Fprintf(&b, "Subject: %s\r\n", subject)
	fmt.Fprintf(&b, "Date: %s\r\n", time.Now().UTC().Format(time.RFC1123Z))
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/plain; charset=UTF-8\r\n\r\n")
	b.WriteString(body)
	return []byte(b.String())
}

// NewFromEnv returns an SMTPNotifier when SMTP_HOST is configured, else a
// LogNotifier (a complete channel that records rather than drops).
func NewFromEnv() Notifier {
	host := strings.TrimSpace(os.Getenv("SMTP_HOST"))
	if host == "" {
		return LogNotifier{}
	}
	return SMTPNotifier{
		host: host,
		port: envOr("SMTP_PORT", "587"),
		user: strings.TrimSpace(os.Getenv("SMTP_USER")),
		pass: os.Getenv("SMTP_PASSWORD"),
		from: envOr("SMTP_FROM", "no-reply@tiangge.app"),
	}
}

func envOr(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

// ResolutionRecipients parses NOTIFY_RESOLUTION_TO (comma-separated) — the
// operational/announce recipients for market-resolution notices. Empty when
// unset (the LogNotifier still records the event; SMTP no-ops on no recipients).
func ResolutionRecipients() []string {
	raw := strings.TrimSpace(os.Getenv("NOTIFY_RESOLUTION_TO"))
	if raw == "" {
		return nil
	}
	var out []string
	for _, tok := range strings.Split(raw, ",") {
		if t := strings.TrimSpace(tok); t != "" {
			out = append(out, t)
		}
	}
	return out
}
