package feed

import "testing"

// TestManualAdapterName documents the multi-key contract for ManualAdapter.
// The auto-settler picks adapters by source key; markets in the wild use
// both 'admin-manual' (canonical) and 'manual' (legacy seed). Both names
// must map to a non-auto-settling adapter so the settler doesn't emit
// WARN on every tick. (ISSUE-005, gstack QA 2026-05-14.)
func TestManualAdapterName(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"", "admin-manual"},          // default
		{"admin-manual", "admin-manual"},
		{"manual", "manual"},          // legacy seed key — must route here
		{"oracle-stub", "oracle-stub"},
	}
	for _, c := range cases {
		t.Run(c.in, func(t *testing.T) {
			a := NewManualAdapter(c.in)
			if got := a.Name(); got != c.want {
				t.Errorf("NewManualAdapter(%q).Name() = %q, want %q", c.in, got, c.want)
			}
			if a.CanSettle("any-rule", nil) {
				t.Errorf("NewManualAdapter(%q).CanSettle = true, want false (manual adapters never auto-settle)", c.in)
			}
		})
	}
}

// TestManualAdapterZeroValueStillWorks ensures &ManualAdapter{} still
// resolves to 'admin-manual'. Some test fixtures and prior call sites
// used the zero-value form; the constructor is the preferred API but
// the zero value must remain backward-compatible.
func TestManualAdapterZeroValueStillWorks(t *testing.T) {
	a := &ManualAdapter{}
	if a.Name() != "admin-manual" {
		t.Errorf("zero-value ManualAdapter.Name() = %q, want admin-manual", a.Name())
	}
}
