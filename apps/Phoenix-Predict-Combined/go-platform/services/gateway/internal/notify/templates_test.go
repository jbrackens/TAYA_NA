package notify

import (
	"context"
	"testing"
)

func TestTemplateRender(t *testing.T) {
	tmpl := Template{
		Subject: "Market resolved {{result}}: {{ticker}}",
		Body:    "Market {{title}} ({{ticker}}) resolved {{result}}. {{unknown}} stays.",
	}
	subject, body := tmpl.Render(map[string]string{
		"result": "YES", "ticker": "BTC-100K", "title": "BTC to 100k",
	})
	if subject != "Market resolved YES: BTC-100K" {
		t.Fatalf("subject render: %q", subject)
	}
	if body != "Market BTC to 100k (BTC-100K) resolved YES. {{unknown}} stays." {
		t.Fatalf("body render (unknown placeholder must remain visible): %q", body)
	}
}

func TestRenderOrFallbackNilStore(t *testing.T) {
	// A nil store must return the caller's fallback unchanged — a missing
	// template store never blocks or blanks a notification.
	subject, body := RenderOrFallback(context.Background(), nil, "any.key",
		map[string]string{"x": "y"}, "FB SUBJECT", "FB BODY")
	if subject != "FB SUBJECT" || body != "FB BODY" {
		t.Fatalf("nil store should pass fallback through, got %q / %q", subject, body)
	}
}
