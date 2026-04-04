package main

import (
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	gatewayhttp "phoenix-revival/gateway/internal/http"
	"phoenix-revival/platform/transport/httpx"
)

type fixtureFile struct {
	Cases []fixtureCase `json:"cases"`
}

type fixtureCase struct {
	Name                 string       `json:"name"`
	UserID               string       `json:"userId"`
	SeedCents            int64        `json:"seedCents"`
	StakeCents           int64        `json:"stakeCents"`
	Odds                 float64      `json:"odds"`
	PlacedSelectionID    string       `json:"placedSelectionId"`
	WinningSelectionID   string       `json:"winningSelectionId,omitempty"`
	WinningSelectionName string       `json:"winningSelectionName,omitempty"`
	ResultSource         string       `json:"resultSource,omitempty"`
	PostLifecycle        string       `json:"postLifecycle,omitempty"`
	AdminDebitCents      int64        `json:"adminDebitCents,omitempty"`
	AdminCreditCents     int64        `json:"adminCreditCents,omitempty"`
	Expected             summaryValue `json:"expected"`
}

type summaryValue struct {
	TotalCreditsCents int64 `json:"totalCreditsCents"`
	TotalDebitsCents  int64 `json:"totalDebitsCents"`
	NetMovementCents  int64 `json:"netMovementCents"`
	EntryCount        int64 `json:"entryCount"`
	DistinctUserCount int64 `json:"distinctUserCount"`
}

type caseResult struct {
	CaseName  string
	Passed    bool
	Expected  summaryValue
	Actual    summaryValue
	FailNotes []string
}

func main() {
	var (
		fixturePath       = flag.String("fixture", "internal/http/testdata/reconciliation/lifecycle_cases.json", "path to reconciliation fixture JSON")
		historicalBetsCSV = flag.String("historical-bets-csv", "", "optional path to historical bets CSV export")
		seedCents         = flag.Int64("seed-cents", 500000, "seed balance cents to use for generated historical cases")
		failOnSkipped     = flag.Bool("fail-on-skipped", false, "fail when historical rows are skipped during conversion")
		outPath           = flag.String("out", "", "optional output markdown path")
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

	warnings := []string{}
	if path := strings.TrimSpace(*historicalBetsCSV); path != "" {
		generated, skipped, err := loadHistoricalBetCases(path, *seedCents)
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to load historical bets csv: %v\n", err)
			os.Exit(1)
		}
		cases = append(cases, generated...)
		warnings = append(warnings, skipped...)
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

	report := renderMarkdownReport(*fixturePath, strings.TrimSpace(*historicalBetsCSV), results, warnings)
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
		fmt.Fprintf(os.Stderr, "reconciliation parity failed: %d/%d cases\n", failed, len(results))
		os.Exit(1)
	}
	if *failOnSkipped && len(warnings) > 0 {
		fmt.Fprintf(os.Stderr, "reconciliation parity skipped: %d historical cases (strict mode)\n", len(warnings))
		os.Exit(1)
	}
}

func loadCases(path string) ([]fixtureCase, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var file fixtureFile
	if err := json.Unmarshal(raw, &file); err != nil {
		return nil, err
	}
	return file.Cases, nil
}

func runCase(tc fixtureCase) caseResult {
	result := caseResult{
		CaseName: tc.Name,
		Expected: tc.Expected,
		Passed:   true,
	}
	const reportActorID = "report-bot"

	mux := http.NewServeMux()
	gatewayhttp.RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	seedBody := fmt.Sprintf(`{"userId":"%s","amountCents":%d,"idempotencyKey":"seed-%s"}`, tc.UserID, tc.SeedCents, tc.Name)
	if status, body := issueJSON(handler, http.MethodPost, "/api/v1/wallet/credit", seedBody, false); status != http.StatusOK {
		result.Passed = false
		result.FailNotes = append(result.FailNotes, fmt.Sprintf("seed credit status=%d body=%s", status, body))
		return result
	}

	placeBody := fmt.Sprintf(`{"userId":"%s","marketId":"m:local:001","selectionId":"%s","stakeCents":%d,"odds":%.3f,"idempotencyKey":"place-%s"}`,
		tc.UserID, tc.PlacedSelectionID, tc.StakeCents, tc.Odds, tc.Name)
	status, body := issueJSON(handler, http.MethodPost, "/api/v1/bets/place", placeBody, false)
	if status != http.StatusOK {
		result.Passed = false
		result.FailNotes = append(result.FailNotes, fmt.Sprintf("place status=%d body=%s", status, body))
		return result
	}

	var placed map[string]any
	if err := json.Unmarshal([]byte(body), &placed); err != nil {
		result.Passed = false
		result.FailNotes = append(result.FailNotes, fmt.Sprintf("decode place response: %v", err))
		return result
	}
	betID, _ := placed["betId"].(string)
	if strings.TrimSpace(betID) == "" {
		result.Passed = false
		result.FailNotes = append(result.FailNotes, "missing betId in place response")
		return result
	}

	switch strings.ToLower(strings.TrimSpace(tc.PostLifecycle)) {
	case "cancel":
		status, body = issueJSONWithHeaders(handler, http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/cancel", `{"reason":"manual cancellation"}`, true, map[string]string{
			"X-Admin-Actor": reportActorID,
		})
		if status != http.StatusOK {
			result.Passed = false
			result.FailNotes = append(result.FailNotes, fmt.Sprintf("cancel status=%d body=%s", status, body))
			return result
		}
	default:
		settlePayload := map[string]any{
			"winningSelectionId": tc.WinningSelectionID,
			"reason":             "result confirmed",
		}
		if strings.TrimSpace(tc.WinningSelectionName) != "" {
			settlePayload["winningSelectionName"] = strings.TrimSpace(tc.WinningSelectionName)
		}
		if strings.TrimSpace(tc.ResultSource) != "" {
			settlePayload["resultSource"] = strings.TrimSpace(tc.ResultSource)
		}
		settleRaw, err := json.Marshal(settlePayload)
		if err != nil {
			result.Passed = false
			result.FailNotes = append(result.FailNotes, fmt.Sprintf("marshal settle payload: %v", err))
			return result
		}
		status, body = issueJSONWithHeaders(handler, http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/settle", string(settleRaw), true, map[string]string{
			"X-Admin-Actor": reportActorID,
		})
		if status != http.StatusOK {
			result.Passed = false
			result.FailNotes = append(result.FailNotes, fmt.Sprintf("settle status=%d body=%s", status, body))
			return result
		}
		if strings.TrimSpace(tc.WinningSelectionName) != "" || strings.TrimSpace(tc.ResultSource) != "" {
			if err := verifySettledAuditMetadata(handler, betID, reportActorID, tc); err != nil {
				result.Passed = false
				result.FailNotes = append(result.FailNotes, err.Error())
				return result
			}
		}
		if strings.EqualFold(strings.TrimSpace(tc.PostLifecycle), "refund") {
			status, body = issueJSONWithHeaders(handler, http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/refund", `{"reason":"operator goodwill"}`, true, map[string]string{
				"X-Admin-Actor": reportActorID,
			})
			if status != http.StatusOK {
				result.Passed = false
				result.FailNotes = append(result.FailNotes, fmt.Sprintf("refund status=%d body=%s", status, body))
				return result
			}
		}
	}
	if tc.AdminDebitCents > 0 {
		adminDebitBody := fmt.Sprintf(`{"userId":"%s","amountCents":%d,"idempotencyKey":"admin-debit-%s","reason":"historical resettlement reversal"}`,
			tc.UserID,
			tc.AdminDebitCents,
			tc.Name,
		)
		status, body = issueJSONWithHeaders(handler, http.MethodPost, "/api/v1/admin/wallet/debit", adminDebitBody, true, map[string]string{
			"X-Admin-Actor": reportActorID,
		})
		if status != http.StatusOK {
			result.Passed = false
			result.FailNotes = append(result.FailNotes, fmt.Sprintf("admin debit status=%d body=%s", status, body))
			return result
		}
	}
	if tc.AdminCreditCents > 0 {
		adminCreditBody := fmt.Sprintf(`{"userId":"%s","amountCents":%d,"idempotencyKey":"admin-credit-%s","reason":"historical resettlement payout"}`,
			tc.UserID,
			tc.AdminCreditCents,
			tc.Name,
		)
		status, body = issueJSONWithHeaders(handler, http.MethodPost, "/api/v1/admin/wallet/credit", adminCreditBody, true, map[string]string{
			"X-Admin-Actor": reportActorID,
		})
		if status != http.StatusOK {
			result.Passed = false
			result.FailNotes = append(result.FailNotes, fmt.Sprintf("admin credit status=%d body=%s", status, body))
			return result
		}
	}

	status, body = issueJSONWithHeaders(handler, http.MethodGet, "/api/v1/admin/wallet/reconciliation", "", true, map[string]string{
		"X-Admin-Actor": reportActorID,
	})
	if status != http.StatusOK {
		result.Passed = false
		result.FailNotes = append(result.FailNotes, fmt.Sprintf("reconciliation status=%d body=%s", status, body))
		return result
	}

	var payload map[string]any
	if err := json.Unmarshal([]byte(body), &payload); err != nil {
		result.Passed = false
		result.FailNotes = append(result.FailNotes, fmt.Sprintf("decode reconciliation response: %v", err))
		return result
	}
	result.Actual = summaryValue{
		TotalCreditsCents: toInt64(payload["totalCreditsCents"]),
		TotalDebitsCents:  toInt64(payload["totalDebitsCents"]),
		NetMovementCents:  toInt64(payload["netMovementCents"]),
		EntryCount:        toInt64(payload["entryCount"]),
		DistinctUserCount: toInt64(payload["distinctUserCount"]),
	}

	compareSummary(&result)
	return result
}

type historicalBetRecord struct {
	eventType            string
	betID                string
	punterID             string
	selectionID          string
	stakeMajor           float64
	odds                 float64
	paidAmountMajor      float64
	unsettledAmountMajor float64
	resettledAmountMajor float64
}

func loadHistoricalBetCases(path string, seedCents int64) ([]fixtureCase, []string, error) {
	records, err := parseHistoricalBetCSV(path)
	if err != nil {
		return nil, nil, err
	}

	byBet := map[string][]historicalBetRecord{}
	for _, record := range records {
		byBet[record.betID] = append(byBet[record.betID], record)
	}

	cases := make([]fixtureCase, 0, len(byBet))
	skipped := make([]string, 0)
	for betID, items := range byBet {
		fc, ok, reason := toFixtureCaseFromHistory(betID, items, seedCents)
		if !ok {
			skipped = append(skipped, fmt.Sprintf("betId=%s skipped: %s", betID, reason))
			continue
		}
		cases = append(cases, fc)
	}
	return cases, skipped, nil
}

func parseHistoricalBetCSV(path string) ([]historicalBetRecord, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1
	reader.TrimLeadingSpace = true

	header, err := reader.Read()
	if err != nil {
		return nil, err
	}
	index := map[string]int{}
	for i, name := range header {
		index[strings.ToLower(strings.TrimSpace(name))] = i
	}

	records := []historicalBetRecord{}
	for {
		row, err := reader.Read()
		if err != nil {
			if err == io.EOF {
				break
			}
			return nil, err
		}
		if rowIsBlank(row) {
			continue
		}

		record := historicalBetRecord{
			eventType:            rowValue(row, index, "eventtype"),
			betID:                rowValue(row, index, "betid"),
			punterID:             rowValue(row, index, "punterid"),
			selectionID:          rowValue(row, index, "selectionid"),
			stakeMajor:           parseDecimal(rowValue(row, index, "stake")),
			odds:                 parseDecimal(rowValue(row, index, "odds")),
			paidAmountMajor:      parseDecimal(rowValue(row, index, "paidamount")),
			unsettledAmountMajor: parseDecimal(rowValue(row, index, "unsettledamount")),
			resettledAmountMajor: parseDecimal(rowValue(row, index, "resettledamount")),
		}
		if record.betID == "" {
			continue
		}
		records = append(records, record)
	}
	return records, nil
}

func rowValue(row []string, index map[string]int, key string) string {
	pos, ok := index[key]
	if !ok || pos < 0 || pos >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[pos])
}

func rowIsBlank(row []string) bool {
	for _, part := range row {
		if strings.TrimSpace(part) != "" {
			return false
		}
	}
	return true
}

func parseDecimal(raw string) float64 {
	value := strings.TrimSpace(raw)
	if value == "" {
		return 0
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0
	}
	return parsed
}

func majorToCents(major float64) int64 {
	return int64(math.Round(major * 100))
}

func toFixtureCaseFromHistory(betID string, events []historicalBetRecord, seedCents int64) (fixtureCase, bool, string) {
	var open historicalBetRecord
	hasOpen := false
	for _, event := range events {
		if strings.EqualFold(strings.TrimSpace(event.eventType), "OPEN") {
			open = event
			hasOpen = true
			break
		}
	}
	if !hasOpen {
		return fixtureCase{}, false, "missing OPEN event"
	}
	if open.stakeMajor <= 0 || open.odds <= 0 {
		return fixtureCase{}, false, "invalid stake/odds on OPEN"
	}

	stakeCents := majorToCents(open.stakeMajor)
	if seedCents <= stakeCents {
		return fixtureCase{}, false, "seed balance must exceed stake"
	}

	name := "historical_" + strings.TrimSpace(betID)
	userID := strings.TrimSpace(open.punterID)
	if userID == "" {
		userID = "unknown"
	}
	userID = "hist-" + userID + "-" + strings.TrimSpace(betID)
	// Historical exports use production selection IDs; the local harness market only
	// exposes "home"/"away", so normalize to supported local IDs.
	selectionID := "home"

	caseOut := fixtureCase{
		Name:              name,
		UserID:            userID,
		SeedCents:         seedCents,
		StakeCents:        stakeCents,
		Odds:              open.odds,
		PlacedSelectionID: selectionID,
		ResultSource:      "historical_csv",
	}

	hasCancel := false
	hasVoided := false
	var settled historicalBetRecord
	hasSettled := false
	var resettled historicalBetRecord
	hasResettled := false
	for _, event := range events {
		eventType := strings.ToUpper(strings.TrimSpace(event.eventType))
		switch eventType {
		case "CANCELLED":
			hasCancel = true
		case "VOIDED":
			hasVoided = true
		case "SETTLED":
			settled = event
			hasSettled = true
		case "RESETTLED":
			resettled = event
			hasResettled = true
		}
	}

	if hasCancel || hasVoided {
		caseOut.PostLifecycle = "cancel"
		caseOut.Expected = summaryValue{
			TotalCreditsCents: seedCents + stakeCents,
			TotalDebitsCents:  stakeCents,
			NetMovementCents:  seedCents,
			EntryCount:        3,
			DistinctUserCount: 1,
		}
		return caseOut, true, ""
	}

	if !hasSettled {
		if hasResettled {
			return fixtureCase{}, false, "RESETTLED present without SETTLED event"
		}
		return fixtureCase{}, false, "no supported terminal event (expected SETTLED/CANCELLED/VOIDED)"
	}

	settledCreditCents := majorToCents(settled.paidAmountMajor)
	if settledCreditCents > 0 {
		caseOut.WinningSelectionID = selectionID
		caseOut.WinningSelectionName = "Home Selection (Historical)"
	} else {
		caseOut.WinningSelectionID = "away"
		caseOut.WinningSelectionName = "Away Selection (Historical)"
	}
	caseOut.PostLifecycle = "none"

	totalCredits := seedCents
	totalDebits := stakeCents
	entryCount := int64(2) // seed credit + place debit

	if settledCreditCents > 0 {
		totalCredits += settledCreditCents
		entryCount++
	}

	if hasResettled {
		resettleDebitCents := majorToCents(resettled.unsettledAmountMajor)
		resettleCreditCents := majorToCents(resettled.resettledAmountMajor)
		if resettleDebitCents < 0 || resettleCreditCents < 0 {
			return fixtureCase{}, false, "invalid RESETTLED amounts"
		}
		caseOut.PostLifecycle = "resettle"
		caseOut.AdminDebitCents = resettleDebitCents
		caseOut.AdminCreditCents = resettleCreditCents

		if resettleDebitCents > 0 {
			totalDebits += resettleDebitCents
			entryCount++
		}
		if resettleCreditCents > 0 {
			totalCredits += resettleCreditCents
			entryCount++
		}
	}

	caseOut.Expected = summaryValue{
		TotalCreditsCents: totalCredits,
		TotalDebitsCents:  totalDebits,
		NetMovementCents:  totalCredits - totalDebits,
		EntryCount:        entryCount,
		DistinctUserCount: 1,
	}
	return caseOut, true, ""
}

func issueJSON(handler http.Handler, method, path, body string, admin bool) (int, string) {
	return issueJSONWithHeaders(handler, method, path, body, admin, nil)
}

func issueJSONWithHeaders(handler http.Handler, method, path, body string, admin bool, headers map[string]string) (int, string) {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if admin {
		req.Header.Set("X-Admin-Role", "admin")
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	return res.Code, strings.TrimSpace(res.Body.String())
}

func verifySettledAuditMetadata(handler http.Handler, betID string, actorID string, tc fixtureCase) error {
	path := fmt.Sprintf("/api/v1/admin/audit-logs?action=bet.settled&actorId=%s&page=1&pageSize=25&sortBy=occurredAt&sortDir=desc", actorID)
	status, body := issueJSONWithHeaders(handler, http.MethodGet, path, "", true, map[string]string{
		"X-Admin-Actor": actorID,
	})
	if status != http.StatusOK {
		return fmt.Errorf("audit logs status=%d body=%s", status, body)
	}

	var payload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal([]byte(body), &payload); err != nil {
		return fmt.Errorf("decode audit logs response: %w", err)
	}

	var details string
	found := false
	for _, item := range payload.Items {
		targetID, _ := item["targetId"].(string)
		if targetID != betID {
			continue
		}
		details, _ = item["details"].(string)
		found = true
		break
	}
	if !found {
		return fmt.Errorf("missing bet.settled audit entry for betId=%s", betID)
	}
	if expected := strings.TrimSpace(tc.WinningSelectionName); expected != "" {
		token := "winningSelectionName=" + expected
		if !strings.Contains(details, token) {
			return fmt.Errorf("audit details missing %q for betId=%s details=%s", token, betID, details)
		}
	}
	if expected := strings.TrimSpace(tc.ResultSource); expected != "" {
		token := "resultSource=" + expected
		if !strings.Contains(details, token) {
			return fmt.Errorf("audit details missing %q for betId=%s details=%s", token, betID, details)
		}
	}
	return nil
}

func toInt64(value any) int64 {
	switch v := value.(type) {
	case float64:
		return int64(v)
	case float32:
		return int64(v)
	case int64:
		return v
	case int:
		return int64(v)
	default:
		return 0
	}
}

func compareSummary(result *caseResult) {
	if result.Actual.TotalCreditsCents != result.Expected.TotalCreditsCents {
		result.Passed = false
		result.FailNotes = append(result.FailNotes, fmt.Sprintf("totalCreditsCents expected=%d actual=%d", result.Expected.TotalCreditsCents, result.Actual.TotalCreditsCents))
	}
	if result.Actual.TotalDebitsCents != result.Expected.TotalDebitsCents {
		result.Passed = false
		result.FailNotes = append(result.FailNotes, fmt.Sprintf("totalDebitsCents expected=%d actual=%d", result.Expected.TotalDebitsCents, result.Actual.TotalDebitsCents))
	}
	if result.Actual.NetMovementCents != result.Expected.NetMovementCents {
		result.Passed = false
		result.FailNotes = append(result.FailNotes, fmt.Sprintf("netMovementCents expected=%d actual=%d", result.Expected.NetMovementCents, result.Actual.NetMovementCents))
	}
	if result.Actual.EntryCount != result.Expected.EntryCount {
		result.Passed = false
		result.FailNotes = append(result.FailNotes, fmt.Sprintf("entryCount expected=%d actual=%d", result.Expected.EntryCount, result.Actual.EntryCount))
	}
	if result.Actual.DistinctUserCount != result.Expected.DistinctUserCount {
		result.Passed = false
		result.FailNotes = append(result.FailNotes, fmt.Sprintf("distinctUserCount expected=%d actual=%d", result.Expected.DistinctUserCount, result.Actual.DistinctUserCount))
	}
}

func renderMarkdownReport(fixturePath string, historicalPath string, results []caseResult, warnings []string) string {
	var passCount int
	for _, result := range results {
		if result.Passed {
			passCount++
		}
	}

	var builder strings.Builder
	builder.WriteString("# Reconciliation Parity Report\n\n")
	builder.WriteString(fmt.Sprintf("- Fixture: `%s`\n", fixturePath))
	if historicalPath != "" {
		builder.WriteString(fmt.Sprintf("- Historical CSV: `%s`\n", historicalPath))
	}
	builder.WriteString(fmt.Sprintf("- Cases: `%d`\n", len(results)))
	builder.WriteString(fmt.Sprintf("- Passed: `%d`\n", passCount))
	builder.WriteString(fmt.Sprintf("- Failed: `%d`\n\n", len(results)-passCount))

	if len(warnings) > 0 {
		builder.WriteString("## Skipped Historical Records\n\n")
		for _, warning := range warnings {
			builder.WriteString(fmt.Sprintf("- %s\n", warning))
		}
		builder.WriteString("\n")
	}

	builder.WriteString("| Case | Status | Expected (C/D/N/E/U) | Actual (C/D/N/E/U) | Notes |\n")
	builder.WriteString("|---|---|---:|---:|---|\n")
	for _, result := range results {
		status := "PASS"
		if !result.Passed {
			status = "FAIL"
		}
		expected := fmt.Sprintf("%d/%d/%d/%d/%d",
			result.Expected.TotalCreditsCents,
			result.Expected.TotalDebitsCents,
			result.Expected.NetMovementCents,
			result.Expected.EntryCount,
			result.Expected.DistinctUserCount,
		)
		actual := fmt.Sprintf("%d/%d/%d/%d/%d",
			result.Actual.TotalCreditsCents,
			result.Actual.TotalDebitsCents,
			result.Actual.NetMovementCents,
			result.Actual.EntryCount,
			result.Actual.DistinctUserCount,
		)
		notes := "ok"
		if len(result.FailNotes) > 0 {
			notes = strings.Join(result.FailNotes, "; ")
		}
		builder.WriteString(fmt.Sprintf("| %s | %s | %s | %s | %s |\n", result.CaseName, status, expected, actual, notes))
	}
	return builder.String()
}
