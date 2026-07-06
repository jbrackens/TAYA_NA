package discover

import (
	"os"
	"path/filepath"
	"sort"
	"testing"
)

// sharedCoverImageRowIDs is the decision core of the thumbnail-hygiene sweep:
// identical image content spanning more than one upstream event group is
// venue/series branding (e.g. one game cover stamped on dozens of unrelated
// questions) and every row carrying it must lose the thumbnail.
func TestSharedCoverImageRowIDs(t *testing.T) {
	hashes := map[string]string{
		"/images/markets/a.jpg": "cover-1",
		"/images/markets/b.jpg": "cover-1",
		"/images/markets/c.jpg": "cover-2",
		"/images/markets/d.jpg": "cover-2",
		"/images/markets/e.jpg": "cover-3",
		"/images/markets/f.jpg": "cover-4",
		"/images/markets/g.jpg": "cover-4",
	}
	hashOf := func(path string) (string, bool) {
		h, ok := hashes[path]
		return h, ok
	}

	rows := []ImportedImageRow{
		// cover-1 spans two different event groups → both dropped.
		{ID: "row-a", ImagePath: "/images/markets/a.jpg", EventGroup: "gta6-btc"},
		{ID: "row-b", ImagePath: "/images/markets/b.jpg", EventGroup: "gta6-election"},
		// cover-2 stays within one event group → kept (an event's own cover
		// on that event's markets is legitimate).
		{ID: "row-c", ImagePath: "/images/markets/c.jpg", EventGroup: "okc-vs-ind"},
		{ID: "row-d", ImagePath: "/images/markets/d.jpg", EventGroup: "OKC-vs-IND "},
		// cover-3 is unique → kept.
		{ID: "row-e", ImagePath: "/images/markets/e.jpg", EventGroup: ""},
		// cover-4 is shared and neither row has an event group → each row is
		// its own group → dropped.
		{ID: "row-f", ImagePath: "/images/markets/f.jpg", EventGroup: ""},
		{ID: "row-g", ImagePath: "/images/markets/g.jpg", EventGroup: ""},
		// unhashable file → left untouched even though it "shares" nothing.
		{ID: "row-x", ImagePath: "/images/markets/missing.jpg", EventGroup: ""},
	}

	got := sharedCoverImageRowIDs(rows, hashOf)
	sort.Strings(got)
	want := []string{"row-a", "row-b", "row-f", "row-g"}
	if len(got) != len(want) {
		t.Fatalf("expected drops %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected drops %v, got %v", want, got)
		}
	}
}

func TestHashHostedImageHashesRehostFolderContent(t *testing.T) {
	root := t.TempDir()
	dir := filepath.Join(root, "images", "markets")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "one.jpg"), []byte("same-bytes"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "two.jpg"), []byte("same-bytes"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "other.jpg"), []byte("different"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	r := NewImageRehoster(root)
	h1, ok1 := r.HashHostedImage("/images/markets/one.jpg")
	h2, ok2 := r.HashHostedImage("/images/markets/two.jpg")
	h3, ok3 := r.HashHostedImage("/images/markets/other.jpg")
	if !ok1 || !ok2 || !ok3 {
		t.Fatalf("expected all three files to hash, got ok=(%v,%v,%v)", ok1, ok2, ok3)
	}
	if h1 != h2 {
		t.Fatalf("identical bytes must produce identical hashes: %q vs %q", h1, h2)
	}
	if h1 == h3 {
		t.Fatalf("different bytes must produce different hashes")
	}

	if _, ok := r.HashHostedImage("/images/markets/absent.jpg"); ok {
		t.Fatalf("missing file must report ok=false")
	}
	if _, ok := r.HashHostedImage("/somewhere/else.jpg"); ok {
		t.Fatalf("paths outside the rehost folder must report ok=false")
	}
	if _, ok := r.HashHostedImage("/images/markets/../../secret.txt"); ok {
		t.Fatalf("traversal paths must report ok=false")
	}

	var nilRehoster *ImageRehoster
	if _, ok := nilRehoster.HashHostedImage("/images/markets/one.jpg"); ok {
		t.Fatalf("nil rehoster must report ok=false")
	}
}
