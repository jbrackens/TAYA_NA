package discover

import "testing"

// TestClassify_UpstreamCategoryWins is the priority invariant: when the
// upstream gives us a category, use it. The keyword classifier is a fallback
// for sources that don't expose categories (Manifold's list endpoint).
func TestClassify_UpstreamCategoryWins(t *testing.T) {
	cases := []struct {
		raw  string
		want string
	}{
		{"Politics", CatPolitics},
		{"politics", CatPolitics},
		{"  POLITICS  ", CatPolitics},
		{"US Politics", CatPolitics},
		{"Crypto", CatCrypto},
		{"Sports", CatSports},
		{"Entertainment", CatEntertainment},
		{"Tech", CatTech},
		{"Technology", CatTech},
		{"Economics", CatEconomics},
		{"Business", CatEconomics},
		{"Finance", CatEconomics},
	}
	for _, c := range cases {
		t.Run(c.raw, func(t *testing.T) {
			got := Classify(Market{Category: c.raw, Title: "irrelevant"})
			if got != c.want {
				t.Errorf("Classify(%q) = %q, want %q", c.raw, got, c.want)
			}
		})
	}
}

// TestClassify_KeywordFallback covers the path Manifold rows take. They
// have empty Category so we fall through to title+description matching.
func TestClassify_KeywordFallback(t *testing.T) {
	cases := []struct {
		title string
		want  string
	}{
		{"Will Trump win the 2028 election?", CatPolitics},
		{"Will the Senate flip in 2026?", CatPolitics},
		{"BTC above 100k by year end?", CatCrypto},
		{"Will Bitcoin hit 200k by 2028?", CatCrypto},
		{"Knicks win the NBA championship?", CatSports},
		{"Will the Lakers make the playoffs?", CatSports},
		{"Best Picture Oscar 2027?", CatEntertainment},
		{"GPT-5 released before July 2026?", CatTech},
		{"Will Apple ship iPhone 17 by Sept 2026?", CatTech},
		{"US recession in 2026?", CatEconomics},
		{"CPI above 3% in May?", CatEconomics},
	}
	for _, c := range cases {
		t.Run(c.title, func(t *testing.T) {
			got := Classify(Market{Title: c.title})
			if got != c.want {
				t.Errorf("Classify(title=%q) = %q, want %q", c.title, got, c.want)
			}
		})
	}
}

// TestClassify_PrimaryResolutionRegression — the round-2 P0 we just fixed.
// The keyword classifier earlier did substring matching, so the politics
// keyword "primary" matched Polymarket's standard description boilerplate
// "primary resolution source will be ...". An NBA market lands in Politics.
// Word-boundary matching prevents this.
func TestClassify_PrimaryResolutionRegression(t *testing.T) {
	m := Market{
		Title:       "Will Kon Knueppel win NBA Rookie of the Year?",
		Description: "The primary resolution source for this market is the NBA",
	}
	got := Classify(m)
	if got == CatPolitics {
		t.Fatalf("regression: 'primary resolution source' false-matched politics. "+
			"Got %q for an NBA market.", got)
	}
	if got != CatSports {
		t.Errorf("Classify NBA Rookie market = %q, want %q (matches via 'NBA')", got, CatSports)
	}
}

// TestClassify_GeneralFallback covers titles that don't match any keyword
// list and have no upstream category. The "general" bucket is the honest
// home for misfits; without it, sync would silently drop these rows.
func TestClassify_GeneralFallback(t *testing.T) {
	cases := []string{
		"Will I learn to ski this winter?",
		"Will my houseplant survive 2026?",
		"Will the bridge be repainted by June?",
	}
	for _, title := range cases {
		got := Classify(Market{Title: title})
		if got != CatGeneral {
			t.Errorf("Classify(%q) = %q, want %q", title, got, CatGeneral)
		}
	}
}

// TestClassify_PriorityOrder documents the cascade. When a title has
// keywords from multiple categories, politics > crypto > sports >
// entertainment > tech > economics > general. This is mostly stable
// (politics wins over crypto on "Bitcoin presidential candidate"), but
// the order matters for any change to the keyword lists.
func TestClassify_PriorityOrder(t *testing.T) {
	// "election" hits politics. "btc" hits crypto. Politics wins.
	m := Market{Title: "Will BTC be a campaign issue in the 2028 election?"}
	if got := Classify(m); got != CatPolitics {
		t.Errorf("politics > crypto cascade broken: got %q for %q", got, m.Title)
	}

	// "nba" hits sports. "movie" hits entertainment. Sports wins.
	m2 := Market{Title: "Will the NBA premiere a movie this season?"}
	if got := Classify(m2); got != CatSports {
		t.Errorf("sports > entertainment cascade broken: got %q for %q", got, m2.Title)
	}
}
