package surveillance

import "testing"

func TestNormalizeEmail(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		// Plus-addressing stripped on any domain.
		{"alice+promo@predict.dev", "alice@predict.dev"},
		{"Alice+A+B@Predict.dev", "alice@predict.dev"},
		// Gmail dot-aliasing + plus + googlemail alias.
		{"john.doe@gmail.com", "johndoe@gmail.com"},
		{"johndoe+shopping@googlemail.com", "johndoe@gmail.com"},
		{"J.O.H.N.Doe@GMAIL.COM", "johndoe@gmail.com"},
		// Non-gmail dots are significant (kept).
		{"john.doe@predict.dev", "john.doe@predict.dev"},
		// Distinct real inboxes stay distinct.
		{"alice@predict.dev", "alice@predict.dev"},
		{"bob@predict.dev", "bob@predict.dev"},
		// Degenerate / malformed inputs pass through lowercased.
		{"   Weird  ", "weird"},
		{"noatsign", "noatsign"},
		{"@nodomain.com", "@nodomain.com"},
		{"nolocal@", "nolocal@"},
		{"+onlytag@gmail.com", "+onlytag@gmail.com"},
	}
	for _, tc := range cases {
		if got := NormalizeEmail(tc.in); got != tc.want {
			t.Errorf("NormalizeEmail(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// The two alias forms and the two distinct users must land in the right groups.
func TestNormalizeEmailGroupsAliasesNotDistinct(t *testing.T) {
	group := map[string][]string{}
	for _, e := range []string{
		"ring@gmail.com",
		"r.i.n.g@gmail.com",
		"ring+alt@googlemail.com",
		"legit@predict.dev",
	} {
		group[NormalizeEmail(e)] = append(group[NormalizeEmail(e)], e)
	}
	if len(group["ring@gmail.com"]) != 3 {
		t.Fatalf("expected 3 gmail aliases grouped, got %v", group)
	}
	if len(group["legit@predict.dev"]) != 1 {
		t.Fatalf("distinct address should stand alone, got %v", group)
	}
}
