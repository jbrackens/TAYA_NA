package discover

import (
	"regexp"
	"sort"
	"strings"
)

// Dedupe drops near-duplicate markets across sources by fuzzy title
// similarity. Verbatim port of the Python dedupe() — same normalizer
// (lowercase, strip non-alphanumeric, collapse whitespace) and the same
// Ratcliff/Obershelp similarity that Python's difflib.SequenceMatcher.ratio()
// computes, so the 0.85 threshold reads identically here.
//
// When a duplicate group collapses, the winner is picked by source
// preference: polymarket > kalshi > manifold (richest card metadata first).
func Dedupe(markets []Market, threshold float64) []Market {
	pref := map[string]int{"polymarket": 0, "kalshi": 1, "manifold": 2}
	sorted := make([]Market, len(markets))
	copy(sorted, markets)
	sort.SliceStable(sorted, func(i, j int) bool {
		pi, pj := 99, 99
		if v, ok := pref[sorted[i].Source]; ok {
			pi = v
		}
		if v, ok := pref[sorted[j].Source]; ok {
			pj = v
		}
		if pi != pj {
			return pi < pj
		}
		return sorted[i].Volume > sorted[j].Volume
	})

	kept := make([]Market, 0, len(sorted))
	keptNorms := make([]string, 0, len(sorted))
	for _, m := range sorted {
		n := normTitle(m.Title)
		if n == "" {
			continue
		}
		isDup := false
		for _, kn := range keptNorms {
			if ratcliffRatio(n, kn) >= threshold {
				isDup = true
				break
			}
		}
		if !isDup {
			kept = append(kept, m)
			keptNorms = append(keptNorms, n)
		}
	}
	return kept
}

var (
	punctRE = regexp.MustCompile(`[^a-z0-9 ]+`)
	wsRE    = regexp.MustCompile(`\s+`)
)

func normTitle(s string) string {
	s = strings.ToLower(s)
	s = punctRE.ReplaceAllString(s, " ")
	s = wsRE.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

// ratcliffRatio implements the same similarity as Python's
// difflib.SequenceMatcher.ratio() = 2 * M / T, where M is the total length
// of all matching subsequences (recursively, on either side of the longest
// match) and T is the combined length of both inputs.
//
// Recursion depth is bounded by O(min(len(a), len(b))), which is fine for
// market titles capped at a few hundred chars.
func ratcliffRatio(a, b string) float64 {
	if len(a) == 0 && len(b) == 0 {
		return 1.0
	}
	if len(a) == 0 || len(b) == 0 {
		return 0.0
	}
	matches := sumMatches([]rune(a), []rune(b))
	return 2.0 * float64(matches) / float64(len([]rune(a))+len([]rune(b)))
}

func sumMatches(a, b []rune) int {
	if len(a) == 0 || len(b) == 0 {
		return 0
	}
	aStart, bStart, length := longestMatch(a, b)
	if length == 0 {
		return 0
	}
	return length +
		sumMatches(a[:aStart], b[:bStart]) +
		sumMatches(a[aStart+length:], b[bStart+length:])
}

// longestMatch finds the longest contiguous matching subsequence between a
// and b using a rolling-DP table. Returns (aStart, bStart, length).
func longestMatch(a, b []rune) (int, int, int) {
	prev := make([]int, len(b)+1)
	curr := make([]int, len(b)+1)
	bestA, bestB, bestLen := 0, 0, 0
	for i := 1; i <= len(a); i++ {
		for j := 1; j <= len(b); j++ {
			if a[i-1] == b[j-1] {
				curr[j] = prev[j-1] + 1
				if curr[j] > bestLen {
					bestLen = curr[j]
					bestA = i - bestLen
					bestB = j - bestLen
				}
			} else {
				curr[j] = 0
			}
		}
		prev, curr = curr, prev
		for k := range curr {
			curr[k] = 0
		}
	}
	return bestA, bestB, bestLen
}
