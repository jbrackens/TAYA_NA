package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const defaultFixturePath = "internal/http/testdata/prediction_reconciliation/lifecycle_cases.json"

type fixtureFile struct {
	Cases []fixtureCase `json:"cases"`
}

type fixtureCase struct {
	Name     string        `json:"name"`
	UserID   string        `json:"userId"`
	MarketID string        `json:"marketId"`
	Ledger   []ledgerEntry `json:"ledger"`
	Expected summaryValue  `json:"expected"`
}

type ledgerEntry struct {
	UserID            string `json:"userId"`
	Direction         string `json:"direction"`
	SourceType        string `json:"sourceType"`
	SourceID          string `json:"sourceId"`
	AmountPointsCents int64  `json:"amountPointsCents"`
	Unit              string `json:"unit"`
}

type summaryValue struct {
	TotalCreditsPointsCents int64            `json:"totalCreditsPointsCents"`
	TotalDebitsPointsCents  int64            `json:"totalDebitsPointsCents"`
	NetMovementPointsCents  int64            `json:"netMovementPointsCents"`
	EntryCount              int64            `json:"entryCount"`
	DistinctUserCount       int64            `json:"distinctUserCount"`
	FinalBalances           map[string]int64 `json:"finalBalancesPointsCents"`
}

type caseResult struct {
	CaseName  string
	Passed    bool
	Expected  summaryValue
	Actual    summaryValue
	FailNotes []string
}

var retiredKeys = map[string]struct{}{
	"amountCents":       {},
	"amount_cents":      {},
	"balanceCents":      {},
	"balance_cents":     {},
	"betId":             {},
	"depositId":         {},
	"depositIntentId":   {},
	"odds":              {},
	"payoutCents":       {},
	"priceCents":        {},
	"seedCents":         {},
	"stakeCents":        {},
	"withdrawalId":      {},
	"withdrawalRequest": {},
}

var retiredText = []string{
	"bet:",
	"bet_settlement",
	"cashier",
	"crypto",
	"deposit",
	"fiat",
	"payout",
	"stake",
	"usd",
	"withdraw",
}

var allowedSourceTypes = map[string]struct{}{
	"starter_points":        {},
	"prediction_order":      {},
	"prediction_settlement": {},
	"mission_reward":        {},
	"point_adjustment":      {},
	"point_refund":          {},
}

func main() {
	var (
		fixturePath = flag.String("fixture", defaultFixturePath, "path to point-native prediction reconciliation fixture JSON")
		outPath     = flag.String("out", "", "optional output markdown path")
	)
	flag.Parse()

	cases, err := loadCases(*fixturePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load fixture: %v\n", err)
		os.Exit(1)
	}
	if len(cases) == 0 {
		fmt.Fprintln(os.Stderr, "no cases in fixture")
		os.Exit(1)
	}

	results := make([]caseResult, 0, len(cases))
	failed := 0
	for _, tc := range cases {
		result := runCase(tc)
		if !result.Passed {
			failed++
		}
		results = append(results, result)
	}

	report := renderMarkdownReport(*fixturePath, results)
	if strings.TrimSpace(*outPath) != "" {
		if err := os.MkdirAll(filepath.Dir(*outPath), 0o755); err != nil {
			fmt.Fprintf(os.Stderr, "failed to create output dir: %v\n", err)
			os.Exit(1)
		}
		if err := os.WriteFile(*outPath, []byte(report), 0o644); err != nil {
			fmt.Fprintf(os.Stderr, "failed to write report: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("wrote report: %s\n", *outPath)
	} else {
		fmt.Println(report)
	}

	if failed > 0 {
		fmt.Fprintf(os.Stderr, "prediction reconciliation failed: %d/%d cases\n", failed, len(results))
		os.Exit(1)
	}
}

func loadCases(path string) ([]fixtureCase, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	if err := rejectRetiredFixtureVocabulary(raw); err != nil {
		return nil, err
	}
	var file fixtureFile
	if err := json.Unmarshal(raw, &file); err != nil {
		return nil, err
	}
	return file.Cases, nil
}

func rejectRetiredFixtureVocabulary(raw []byte) error {
	var decoded any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return err
	}
	return walkFixtureValue(decoded)
}

func walkFixtureValue(value any) error {
	switch v := value.(type) {
	case map[string]any:
		for key, child := range v {
			if _, found := retiredKeys[key]; found {
				return fmt.Errorf("fixture uses retired field %q; use point-native fields", key)
			}
			if err := walkFixtureValue(child); err != nil {
				return err
			}
		}
	case []any:
		for _, child := range v {
			if err := walkFixtureValue(child); err != nil {
				return err
			}
		}
	case string:
		lower := strings.ToLower(v)
		for _, retired := range retiredText {
			if strings.Contains(lower, retired) {
				return fmt.Errorf("fixture uses retired text %q in %q", retired, v)
			}
		}
	}
	return nil
}

func runCase(tc fixtureCase) caseResult {
	result := caseResult{
		CaseName: tc.Name,
		Expected: tc.Expected,
		Passed:   true,
	}
	actual := summaryValue{FinalBalances: map[string]int64{}}
	distinctUsers := map[string]struct{}{}

	for i, entry := range tc.Ledger {
		if strings.TrimSpace(entry.UserID) == "" {
			result.FailNotes = append(result.FailNotes, fmt.Sprintf("ledger[%d] missing userId", i))
			continue
		}
		if entry.AmountPointsCents <= 0 {
			result.FailNotes = append(result.FailNotes, fmt.Sprintf("ledger[%d] amountPointsCents must be positive", i))
			continue
		}
		if entry.Unit != "PTS" {
			result.FailNotes = append(result.FailNotes, fmt.Sprintf("ledger[%d] unit must be PTS", i))
			continue
		}
		if _, ok := allowedSourceTypes[entry.SourceType]; !ok {
			result.FailNotes = append(result.FailNotes, fmt.Sprintf("ledger[%d] unsupported sourceType %q", i, entry.SourceType))
			continue
		}
		if strings.TrimSpace(entry.SourceID) == "" {
			result.FailNotes = append(result.FailNotes, fmt.Sprintf("ledger[%d] missing sourceId", i))
			continue
		}

		distinctUsers[entry.UserID] = struct{}{}
		actual.EntryCount++
		switch entry.Direction {
		case "credit":
			actual.TotalCreditsPointsCents += entry.AmountPointsCents
			actual.FinalBalances[entry.UserID] += entry.AmountPointsCents
		case "debit":
			actual.TotalDebitsPointsCents += entry.AmountPointsCents
			actual.FinalBalances[entry.UserID] -= entry.AmountPointsCents
		default:
			result.FailNotes = append(result.FailNotes, fmt.Sprintf("ledger[%d] direction must be credit or debit", i))
		}
	}
	actual.NetMovementPointsCents = actual.TotalCreditsPointsCents - actual.TotalDebitsPointsCents
	actual.DistinctUserCount = int64(len(distinctUsers))
	result.Actual = actual

	if !sameSummary(actual, tc.Expected) {
		result.FailNotes = append(result.FailNotes, "summary mismatch")
	}
	if len(result.FailNotes) > 0 {
		result.Passed = false
	}
	return result
}

func sameSummary(a, b summaryValue) bool {
	if a.TotalCreditsPointsCents != b.TotalCreditsPointsCents ||
		a.TotalDebitsPointsCents != b.TotalDebitsPointsCents ||
		a.NetMovementPointsCents != b.NetMovementPointsCents ||
		a.EntryCount != b.EntryCount ||
		a.DistinctUserCount != b.DistinctUserCount {
		return false
	}
	if len(a.FinalBalances) != len(b.FinalBalances) {
		return false
	}
	for key, av := range a.FinalBalances {
		if b.FinalBalances[key] != av {
			return false
		}
	}
	return true
}

func renderMarkdownReport(fixturePath string, results []caseResult) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# Prediction Point Reconciliation Report\n\n")
	fmt.Fprintf(&b, "- Fixture: `%s`\n", fixturePath)
	fmt.Fprintf(&b, "- Unit: `PTS`\n")
	fmt.Fprintf(&b, "- Cases: %d\n\n", len(results))
	fmt.Fprintf(&b, "| Case | Status | Credits | Debits | Net | Entries | Users |\n")
	fmt.Fprintf(&b, "|---|---:|---:|---:|---:|---:|---:|\n")
	for _, result := range results {
		status := "Pass"
		if !result.Passed {
			status = "Fail"
		}
		fmt.Fprintf(&b, "| %s | %s | %d | %d | %d | %d | %d |\n",
			result.CaseName,
			status,
			result.Actual.TotalCreditsPointsCents,
			result.Actual.TotalDebitsPointsCents,
			result.Actual.NetMovementPointsCents,
			result.Actual.EntryCount,
			result.Actual.DistinctUserCount,
		)
	}
	for _, result := range results {
		if result.Passed {
			continue
		}
		sort.Strings(result.FailNotes)
		fmt.Fprintf(&b, "\n## %s\n\n", result.CaseName)
		for _, note := range result.FailNotes {
			fmt.Fprintf(&b, "- %s\n", note)
		}
	}
	return b.String()
}
