package discover

// Curation guard contract. Two halves, equally important:
//
//	1. Ad spam is rejected — pinned to the REAL string that reached the
//	   top of discovery (2026-08-08).
//	2. Legitimate markets that merely mention gambling topics are KEPT —
//	   the guard is phrase-shaped, and these pins keep it that way.

import "testing"

func TestIsUnsuitableImport_RejectsAdSpam(t *testing.T) {
	spam := []string{
		// The one that started it all, plus its whole family as observed
		// in the live catalog (voided rows, 2026-08).
		"11kk Bangladesh | Best Online Betting & Live Casino Platform",
		"KX8 Bangladesh – Premier Online Casino & Sports Betting Site",
		"SONABET Bangladesh | Top Online Betting & Casino Platform",
		"Goldsbet Bangladesh - Top Online Betting & Casino Platform",
		"MedHub USA | Trusted Online Pharmacy in the USA",
		"MB5 | Nhà Cái MB5 – Nền Tảng Giải Trí Trực Tuyến",
		"Best online betting site 2026",
		"Casino platform with instant payouts",
		"MegaWin | trusted gambling app",
		"Use promo code WIN500 today",
		"200 free spins for new players",
		"No-deposit bonus for Bangladesh players",
		"Sign-up bonus 100%",
		"Welcome bonus up to $500",
		"Official site of LuckyBet",
	}
	for _, title := range spam {
		if !IsUnsuitableImport(title) {
			t.Errorf("expected unsuitable: %q", title)
		}
	}
}

func TestIsUnsuitableImport_KeepsLegitimateMarkets(t *testing.T) {
	legit := []string{
		// Gambling as a TOPIC is a real prediction space.
		"Will sports betting be legalized in Texas by 2027?",
		"Will the Mega Millions jackpot exceed $1B this year?",
		"Will a casino open in Times Square before 2028?",
		"Will online gambling revenue in NJ beat Nevada in 2026?",
		"Will DraftKings stock close above $50 on Dec 31?",
		// A REAL open market from the live catalog: the cycling team
		// "Team Visma | Lease a Bike" carries a pipe in its name — the
		// reason there is no bare-pipe signature.
		"Will Jonas Vingegaard start another race for Team Visma | Lease a Bike in 2026?",
		// Manifold personal markets mention their mana bonus — not ads.
		"Will I leave the house every day in August? (Ṁ10 Bonus)",
		// REAL catalog rows the first sweep wrongly voided: Manifold
		// questions that reference their subject by URL. URLs are not an
		// ad signature on this catalog.
		"Will https://x.com/repligate/status/2086237469843087758 turn out accurate/prescient by mid-2028?",
		"will anyone from alexey guzey newscience become https://www.cosmos-institute.org/grants by eoy2030?",
		// Ordinary catalog titles.
		"Will Oprah Winfrey win the 2028 Democratic presidential nomination?",
		"Fed cuts rates at the May FOMC meeting",
		"Will it rain in Singapore tomorrow?",
	}
	for _, title := range legit {
		if IsUnsuitableImport(title) {
			t.Errorf("false positive — legitimate market rejected: %q", title)
		}
	}
}
