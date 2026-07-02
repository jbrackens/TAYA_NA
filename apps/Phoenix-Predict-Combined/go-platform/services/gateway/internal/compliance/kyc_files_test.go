package compliance

import (
	"bytes"
	"context"
	"strings"
	"testing"
)

func TestValidateDocumentFile(t *testing.T) {
	cases := []struct {
		name        string
		content     []byte
		contentType string
		wantErr     bool
	}{
		{"valid jpeg", []byte("fake-jpeg"), "image/jpeg", false},
		{"valid pdf", []byte("%PDF"), "application/pdf", false},
		{"case tolerant", []byte("x"), " IMAGE/PNG ", false},
		{"empty content", nil, "image/jpeg", true},
		{"oversize", make([]byte, MaxDocumentFileBytes+1), "image/jpeg", true},
		{"disallowed type", []byte("<svg/>"), "image/svg+xml", true},
		{"executable", []byte("MZ"), "application/octet-stream", true},
		{"missing type", []byte("x"), "", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateDocumentFile(tc.content, tc.contentType)
			if (err != nil) != tc.wantErr {
				t.Fatalf("err=%v, wantErr=%v", err, tc.wantErr)
			}
		})
	}
}

func TestParseDocumentRowID(t *testing.T) {
	for raw, want := range map[string]int64{"doc:12": 12, "12": 12, " doc:3 ": 3} {
		got, err := parseDocumentRowID(raw)
		if err != nil || got != want {
			t.Fatalf("parse %q: got %d err %v, want %d", raw, got, err, want)
		}
	}
	for _, bad := range []string{"", "doc:", "doc:abc", "-4", "doc:-4", "doc:0"} {
		if _, err := parseDocumentRowID(bad); err == nil {
			t.Fatalf("expected error for %q", bad)
		}
	}
}

// The mock is dev's stand-in for the Postgres store, so it must honor the
// same contract: ownership binding, validation, roundtrip fidelity.
func TestMockDocumentFileRoundtrip(t *testing.T) {
	m := NewMockKYCService()
	ctx := context.Background()

	doc, err := m.SubmitDocument(ctx, "u-1", VerificationDocument{Type: "passport"})
	if err != nil {
		t.Fatalf("submit: %v", err)
	}

	content := []byte("fake-passport-scan")
	receipt, err := m.AttachDocumentFile(ctx, "u-1", doc.ID, content, "image/jpeg")
	if err != nil {
		t.Fatalf("attach: %v", err)
	}
	if receipt.SizeBytes != int64(len(content)) || receipt.SHA256 == "" {
		t.Fatalf("bad receipt: %+v", receipt)
	}
	if len(receipt.Content) != 0 {
		t.Fatal("attach receipt must not echo the bytes back")
	}

	file, err := m.GetDocumentFile(ctx, doc.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if !bytes.Equal(file.Content, content) || file.UserID != "u-1" || file.ContentType != "image/jpeg" {
		t.Fatalf("roundtrip mismatch: %+v", file)
	}

	// Ownership: attaching to someone else's document is not-found.
	if _, err := m.AttachDocumentFile(ctx, "u-2", doc.ID, content, "image/jpeg"); err == nil {
		t.Fatal("expected ownership violation to fail")
	}
	// Unknown document.
	if _, err := m.GetDocumentFile(ctx, "doc:9999"); err == nil {
		t.Fatal("expected missing file to fail")
	}
	// Invalid file is rejected before storage.
	if _, err := m.AttachDocumentFile(ctx, "u-1", doc.ID, []byte("x"), "text/html"); err == nil ||
		!strings.Contains(err.Error(), "not allowed") {
		t.Fatalf("expected content-type rejection, got %v", err)
	}
}

// Compile-time proof the concrete stores satisfy the optional capability, and
// the fail-closed service deliberately does not.
var (
	_ DocumentFileStore = (*PostgresKYCService)(nil)
	_ DocumentFileStore = (*MockKYCService)(nil)
)

func TestFailClosedKYCServiceDoesNotStoreFiles(t *testing.T) {
	var svc KYCService = NewFailClosedKYCService()
	if _, ok := svc.(DocumentFileStore); ok {
		t.Fatal("fail-closed KYC service must not accept document files")
	}
}
