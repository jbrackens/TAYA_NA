package http

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"taptrade/platform/transport/httpx"

	_ "github.com/lib/pq"
)

func socialUserContext(req *http.Request, userID string) *http.Request {
	return req.WithContext(httpx.WithTestUser(req.Context(), userID, userID, "user"))
}

func socialAdminContext(req *http.Request) *http.Request {
	return req.WithContext(httpx.WithTestUser(req.Context(), "admin-social-1", "admin@taptrade.local", "admin"))
}

func TestMarketSocialSQLWriteLimiterBlocksAcrossRouteInstances(t *testing.T) {
	dsn := strings.TrimSpace(os.Getenv("GATEWAY_DB_DSN"))
	if dsn == "" {
		t.Skip("set GATEWAY_DB_DSN to run the DB-backed social write limiter proof")
	}

	ctx := context.Background()
	firstDB, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open first gateway db: %v", err)
	}
	t.Cleanup(func() { _ = firstDB.Close() })
	if err := firstDB.PingContext(ctx); err != nil {
		t.Skipf("GATEWAY_DB_DSN set but db not reachable: %v", err)
	}
	secondDB, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open second gateway db: %v", err)
	}
	t.Cleanup(func() { _ = secondDB.Close() })

	firstStore := newSQLMarketSocialStore(firstDB)
	secondStore := newSQLMarketSocialStore(secondDB)
	if err := firstStore.ensureSchema(ctx); err != nil {
		t.Fatalf("ensure social schema: %v", err)
	}
	firstUserLimiter := newSQLSocialWriteLimiter(firstDB, 1, 1)
	firstIPLimiter := newSQLSocialWriteLimiter(firstDB, 1, 1)
	secondUserLimiter := newSQLSocialWriteLimiter(secondDB, 1, 1)
	secondIPLimiter := newSQLSocialWriteLimiter(secondDB, 1, 1)
	if err := firstUserLimiter.ensureSchema(ctx); err != nil {
		t.Fatalf("ensure social limiter schema: %v", err)
	}

	suffix := fmt.Sprintf("sql-social-limit-%d", time.Now().UnixNano())
	userID := "user-" + suffix
	ipUserA := "ip-a-" + suffix
	ipUserB := "ip-b-" + suffix
	userMarketID := "mkt-user-" + suffix
	ipMarketID := "mkt-ip-" + suffix
	firstUserIP := "203.0.113.31"
	secondUserIP := "203.0.113.32"
	sharedIP := "203.0.113.33"
	cleanup := func() {
		_, _ = firstDB.ExecContext(ctx,
			`DELETE FROM prediction_social_write_limits
			  WHERE limiter_key IN ($1, $2, $3, $4, $5, $6)`,
			"comment:"+userID,
			"comment:"+ipUserA,
			"comment:"+ipUserB,
			"comment:"+firstUserIP,
			"comment:"+secondUserIP,
			"comment:"+sharedIP,
		)
		_, _ = firstDB.ExecContext(ctx,
			`DELETE FROM prediction_market_comments
			  WHERE market_id IN ($1, $2)
			     OR user_id IN ($3, $4, $5)`,
			userMarketID, ipMarketID, userID, ipUserA, ipUserB,
		)
	}
	cleanup()
	t.Cleanup(cleanup)

	firstMux := http.NewServeMux()
	registerMarketSocialRoutes(firstMux, firstStore, firstUserLimiter, firstIPLimiter, nil)
	secondMux := http.NewServeMux()
	registerMarketSocialRoutes(secondMux, secondStore, secondUserLimiter, secondIPLimiter, nil)

	createSocialComment(t, firstMux, userMarketID, userID, firstUserIP, "First instance user-limit comment.")
	blockedSameUser := postSocialComment(secondMux, userMarketID, userID, secondUserIP, "Second instance same-user burst.")
	if blockedSameUser.Code != http.StatusTooManyRequests {
		t.Fatalf("expected cross-instance same-user write to be rate-limited, got %d body=%s", blockedSameUser.Code, blockedSameUser.Body.String())
	}
	assertSocialCommentCount(t, secondMux, userMarketID, 1)

	createSocialComment(t, firstMux, ipMarketID, ipUserA, sharedIP, "First shared-IP account.")
	blockedSharedIP := postSocialComment(secondMux, ipMarketID, ipUserB, sharedIP, "Second shared-IP account.")
	if blockedSharedIP.Code != http.StatusTooManyRequests {
		t.Fatalf("expected cross-instance same-IP write to be rate-limited, got %d body=%s", blockedSharedIP.Code, blockedSharedIP.Body.String())
	}
	assertSocialCommentCount(t, secondMux, ipMarketID, 1)
}

func createSocialComment(t *testing.T, handler http.Handler, marketID, userID, ip, body string) {
	t.Helper()
	res := postSocialComment(handler, marketID, userID, ip, body)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected social comment create 201, got %d body=%s", res.Code, res.Body.String())
	}
}

func postSocialComment(handler http.Handler, marketID, userID, ip, body string) *httptest.ResponseRecorder {
	req := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/"+marketID+"/comments", bytes.NewBufferString(`{"body":`+strconv.Quote(body)+`}`)),
		userID,
	)
	req.Header.Set("X-Forwarded-For", ip)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	return res
}

func assertSocialCommentCount(t *testing.T, handler http.Handler, marketID string, want int) {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/social/markets/"+marketID+"/comments?limit=10", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected list comments 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Items []marketComment `json:"items"`
		Total int             `json:"total"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode comments payload: %v", err)
	}
	if payload.Total != want || len(payload.Items) != want {
		t.Fatalf("expected %d persisted comments, got total=%d items=%+v", want, payload.Total, payload.Items)
	}
}

func TestMarketSocialSQLStorePersistsAcrossServiceInstances(t *testing.T) {
	dsn := strings.TrimSpace(os.Getenv("GATEWAY_DB_DSN"))
	if dsn == "" {
		t.Skip("set GATEWAY_DB_DSN to run the DB-backed social graph proof")
	}

	ctx := context.Background()
	firstDB, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open first gateway db: %v", err)
	}
	t.Cleanup(func() { _ = firstDB.Close() })
	if err := firstDB.PingContext(ctx); err != nil {
		t.Skipf("GATEWAY_DB_DSN set but db not reachable: %v", err)
	}
	secondDB, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open second gateway db: %v", err)
	}
	t.Cleanup(func() { _ = secondDB.Close() })

	first := newSQLMarketSocialStore(firstDB)
	second := newSQLMarketSocialStore(secondDB)
	if err := first.ensureSchema(ctx); err != nil {
		t.Fatalf("ensure social schema: %v", err)
	}
	ensureSocialActivityDependencyTables(t, firstDB)

	suffix := fmt.Sprintf("sql-social-%d", time.Now().UnixNano())
	marketID := "mkt-" + suffix
	authorID := "author-" + suffix
	followerID := "follower-" + suffix
	reporterID := "reporter-" + suffix
	cleanup := func() {
		_, _ = firstDB.ExecContext(ctx,
			`DELETE FROM prediction_user_follows
			  WHERE target_user_id IN ($1, $2, $3)
			     OR follower_user_id IN ($1, $2, $3)`,
			authorID, followerID, reporterID,
		)
		_, _ = firstDB.ExecContext(ctx,
			`DELETE FROM prediction_market_comments
			  WHERE market_id = $1
			     OR user_id IN ($2, $3, $4)`,
			marketID, authorID, followerID, reporterID,
		)
	}
	cleanup()
	t.Cleanup(cleanup)

	comment, err := first.CreateComment(ctx, marketID, "", authorID, "DB-backed social graph proof.", nil)
	if err != nil {
		t.Fatalf("first service create comment: %v", err)
	}
	comments, err := second.ListComments(ctx, marketID, 10)
	if err != nil {
		t.Fatalf("second service list comments: %v", err)
	}
	if len(comments) != 1 || comments[0].ID != comment.ID || comments[0].UserID != authorID {
		t.Fatalf("second service did not observe first service comment: %+v", comments)
	}

	reacted, err := first.React(ctx, comment.ID, followerID)
	if err != nil {
		t.Fatalf("first service react: %v", err)
	}
	if reacted.ReactionCount != 1 {
		t.Fatalf("expected first reaction count 1, got %+v", reacted)
	}
	reacted, err = second.React(ctx, comment.ID, followerID)
	if err != nil {
		t.Fatalf("second service duplicate react: %v", err)
	}
	if reacted.ReactionCount != 1 {
		t.Fatalf("duplicate cross-service reaction should stay idempotent, got %+v", reacted)
	}

	reported, err := first.Report(ctx, comment.ID, reporterID, "spam")
	if err != nil {
		t.Fatalf("first service report: %v", err)
	}
	if reported.ReportCount != 1 {
		t.Fatalf("expected one open report, got %+v", reported)
	}
	reports, err := second.ListReports(ctx, "open", 10)
	if err != nil {
		t.Fatalf("second service list reports: %v", err)
	}
	if len(reports) != 1 || reports[0].CommentID != comment.ID || reports[0].ReporterUserID != reporterID {
		t.Fatalf("second service did not observe first service report: %+v", reports)
	}
	if err := second.ResolveReport(ctx, reports[0].ID, "admin-sql-social", "dismissed", "Reviewed by trust queue."); err != nil {
		t.Fatalf("second service resolve report: %v", err)
	}
	comments, err = first.ListComments(ctx, marketID, 10)
	if err != nil {
		t.Fatalf("first service relist comments: %v", err)
	}
	if len(comments) != 1 || comments[0].ReportCount != 0 {
		t.Fatalf("resolved report should no longer count as open, got %+v", comments)
	}

	profile, err := first.Follow(ctx, authorID, followerID)
	if err != nil {
		t.Fatalf("first service follow: %v", err)
	}
	if profile.FollowerCount != 1 || !profile.ViewerFollowing {
		t.Fatalf("expected first follow to be visible, got %+v", profile)
	}
	profile, err = second.Follow(ctx, authorID, followerID)
	if err != nil {
		t.Fatalf("second service duplicate follow: %v", err)
	}
	if profile.FollowerCount != 1 || !profile.ViewerFollowing {
		t.Fatalf("duplicate cross-service follow should stay idempotent, got %+v", profile)
	}
	profile, err = second.PublicProfile(ctx, authorID, followerID)
	if err != nil {
		t.Fatalf("second service public profile: %v", err)
	}
	if profile.CommentCount != 1 || profile.FollowerCount != 1 || !profile.ViewerFollowing {
		t.Fatalf("second service profile did not reflect shared graph state: %+v", profile)
	}

	userActivity, err := second.UserActivity(ctx, authorID, 10)
	if err != nil {
		t.Fatalf("second service user activity: %v", err)
	}
	if !hasSocialActivity(userActivity, "comment", authorID, comment.ID) || !hasSocialActivity(userActivity, "follow", followerID, "") {
		t.Fatalf("second service user activity missing shared comment/follow rows: %+v", userActivity)
	}
	globalActivity, err := second.GlobalActivity(ctx, 10)
	if err != nil {
		t.Fatalf("second service global activity: %v", err)
	}
	if !hasSocialActivity(globalActivity, "comment", authorID, comment.ID) || !hasSocialActivity(globalActivity, "follow", followerID, "") {
		t.Fatalf("second service global activity missing shared comment/follow rows: %+v", globalActivity)
	}
}

func ensureSocialActivityDependencyTables(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
CREATE TABLE IF NOT EXISTS prediction_trades (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  seller_id TEXT,
  market_id TEXT NOT NULL,
  side TEXT NOT NULL,
  price_points INT NOT NULL,
  quantity INT NOT NULL,
  traded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS prediction_settlements (
  id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL,
  result TEXT NOT NULL,
  settled_by TEXT,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS prediction_payouts (
  id TEXT PRIMARY KEY,
  settlement_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  side TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  delta_points BIGINT NOT NULL,
  reason TEXT NOT NULL,
  market_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  board_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rank INT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`)
	if err != nil {
		t.Fatalf("ensure social activity dependency tables: %v", err)
	}
}

func hasSocialActivity(items []socialActivityItem, kind, userID, commentID string) bool {
	for _, item := range items {
		if item.Type != kind || item.UserID != userID {
			continue
		}
		if commentID != "" && item.CommentID != commentID {
			continue
		}
		return true
	}
	return false
}

func TestMarketSocialCommentsRepliesReactionsAndReports(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-1/comments", bytes.NewBufferString(`{"body":"This resolution rule is clear."}`)),
		"u-social-1",
	)
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d body=%s", createRes.Code, createRes.Body.String())
	}
	var createPayload struct {
		Comment marketComment `json:"comment"`
	}
	if err := json.Unmarshal(createRes.Body.Bytes(), &createPayload); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}
	if createPayload.Comment.MarketID != "mkt-social-1" || createPayload.Comment.UserID != "u-social-1" {
		t.Fatalf("unexpected created comment: %+v", createPayload.Comment)
	}

	replyBody := `{"body":"Replying with source context.","parentId":"` + createPayload.Comment.ID + `"}`
	replyReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-1/comments", bytes.NewBufferString(replyBody)),
		"u-social-2",
	)
	replyRes := httptest.NewRecorder()
	handler.ServeHTTP(replyRes, replyReq)
	if replyRes.Code != http.StatusCreated {
		t.Fatalf("expected reply status 201, got %d body=%s", replyRes.Code, replyRes.Body.String())
	}

	reactReq := socialUserContext(httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/react", nil), "u-social-2")
	reactRes := httptest.NewRecorder()
	handler.ServeHTTP(reactRes, reactReq)
	if reactRes.Code != http.StatusOK {
		t.Fatalf("expected react status 200, got %d body=%s", reactRes.Code, reactRes.Body.String())
	}
	reactAgainReq := socialUserContext(httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/react", nil), "u-social-2")
	reactAgainRes := httptest.NewRecorder()
	handler.ServeHTTP(reactAgainRes, reactAgainReq)
	if reactAgainRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate react status 200, got %d body=%s", reactAgainRes.Code, reactAgainRes.Body.String())
	}
	var reactPayload struct {
		Comment marketComment `json:"comment"`
	}
	if err := json.Unmarshal(reactAgainRes.Body.Bytes(), &reactPayload); err != nil {
		t.Fatalf("decode react payload: %v", err)
	}
	if reactPayload.Comment.ReactionCount != 1 {
		t.Fatalf("expected idempotent reaction count 1, got %+v", reactPayload.Comment)
	}

	reportReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/report", bytes.NewBufferString(`{"reason":"spam"}`)),
		"u-social-3",
	)
	reportRes := httptest.NewRecorder()
	handler.ServeHTTP(reportRes, reportReq)
	if reportRes.Code != http.StatusOK {
		t.Fatalf("expected report status 200, got %d body=%s", reportRes.Code, reportRes.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/social/markets/mkt-social-1/comments?limit=10", nil)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []marketComment `json:"items"`
		Total int             `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode list payload: %v", err)
	}
	if listPayload.Total != 2 || len(listPayload.Items) != 2 {
		t.Fatalf("expected comment and reply, got total=%d len=%d", listPayload.Total, len(listPayload.Items))
	}
	if listPayload.Items[1].ReactionCount != 1 || listPayload.Items[1].ReportCount != 1 {
		t.Fatalf("expected parent comment reaction/report counts, got %+v", listPayload.Items[1])
	}
	if listPayload.Items[0].ParentID != createPayload.Comment.ID {
		t.Fatalf("expected newest reply to reference parent %q, got %+v", createPayload.Comment.ID, listPayload.Items[0])
	}
}

func TestMarketSocialAdminReportsQueue(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "false")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-admin/comments", bytes.NewBufferString(`{"body":"=HYPERLINK(\"https://example.invalid\",\"review\")"}`)),
		"u-commenter-1",
	)
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d body=%s", createRes.Code, createRes.Body.String())
	}
	var createPayload struct {
		Comment marketComment `json:"comment"`
	}
	if err := json.Unmarshal(createRes.Body.Bytes(), &createPayload); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}

	reportReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/report", bytes.NewBufferString(`{"reason":"=low quality"}`)),
		"u-reporter-1",
	)
	reportRes := httptest.NewRecorder()
	handler.ServeHTTP(reportRes, reportReq)
	if reportRes.Code != http.StatusOK {
		t.Fatalf("expected report status 200, got %d body=%s", reportRes.Code, reportRes.Body.String())
	}

	anonListReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/reports", nil)
	anonListRes := httptest.NewRecorder()
	handler.ServeHTTP(anonListRes, anonListReq)
	if anonListRes.Code != http.StatusForbidden {
		t.Fatalf("expected non-admin reports list status 403, got %d body=%s", anonListRes.Code, anonListRes.Body.String())
	}

	listReq := socialAdminContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/reports?limit=10", nil))
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected reports list status 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []socialReport `json:"items"`
		Total int            `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode reports list payload: %v", err)
	}
	if listPayload.Total != 1 || len(listPayload.Items) != 1 {
		t.Fatalf("expected one open report, got total=%d items=%+v", listPayload.Total, listPayload.Items)
	}
	report := listPayload.Items[0]
	if report.Status != "open" || report.MarketID != "mkt-social-admin" || report.CommentID != createPayload.Comment.ID {
		t.Fatalf("unexpected report row: %+v", report)
	}

	resolveReq := socialAdminContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/admin/social/reports/"+report.ID+"/resolve", bytes.NewBufferString(`{"status":"dismissed","note":"Reviewed by trust queue."}`)),
	)
	resolveRes := httptest.NewRecorder()
	handler.ServeHTTP(resolveRes, resolveReq)
	if resolveRes.Code != http.StatusOK {
		t.Fatalf("expected resolve status 200, got %d body=%s", resolveRes.Code, resolveRes.Body.String())
	}

	openReq := socialAdminContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/reports?status=open&limit=10", nil))
	openRes := httptest.NewRecorder()
	handler.ServeHTTP(openRes, openReq)
	if openRes.Code != http.StatusOK {
		t.Fatalf("expected open reports status 200, got %d body=%s", openRes.Code, openRes.Body.String())
	}
	var openPayload struct {
		Items []socialReport `json:"items"`
		Total int            `json:"total"`
	}
	if err := json.Unmarshal(openRes.Body.Bytes(), &openPayload); err != nil {
		t.Fatalf("decode open reports payload: %v", err)
	}
	if openPayload.Total != 0 {
		t.Fatalf("expected no open reports after dismissal, got %+v", openPayload)
	}

	allReq := socialAdminContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/reports?status=all&limit=10", nil))
	allRes := httptest.NewRecorder()
	handler.ServeHTTP(allRes, allReq)
	if allRes.Code != http.StatusOK {
		t.Fatalf("expected all reports status 200, got %d body=%s", allRes.Code, allRes.Body.String())
	}
	var allPayload struct {
		Items []socialReport `json:"items"`
		Total int            `json:"total"`
	}
	if err := json.Unmarshal(allRes.Body.Bytes(), &allPayload); err != nil {
		t.Fatalf("decode all reports payload: %v", err)
	}
	if allPayload.Total != 1 || allPayload.Items[0].Status != "dismissed" || allPayload.Items[0].ReviewedBy != "admin@taptrade.local" {
		t.Fatalf("expected dismissed reviewed report, got %+v", allPayload)
	}

	csvReq := socialAdminContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/reports?status=all&format=csv&limit=10", nil))
	csvRes := httptest.NewRecorder()
	handler.ServeHTTP(csvRes, csvReq)
	if csvRes.Code != http.StatusOK {
		t.Fatalf("expected reports csv status 200, got %d body=%s", csvRes.Code, csvRes.Body.String())
	}
	if ct := csvRes.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/csv") {
		t.Fatalf("expected text/csv content type, got %q", ct)
	}
	if cd := csvRes.Header().Get("Content-Disposition"); !strings.Contains(cd, `filename="social-reports-all.csv"`) {
		t.Fatalf("expected social reports csv filename, got %q", cd)
	}
	rows, err := csv.NewReader(strings.NewReader(csvRes.Body.String())).ReadAll()
	if err != nil {
		t.Fatalf("read social reports csv: %v", err)
	}
	expectedHeader := []string{"report_id", "comment_id", "market_id", "comment_user_id", "reporter_user_id", "reason", "status", "created_at", "reviewed_at", "reviewed_by", "review_note", "comment_body"}
	if len(rows) != 2 {
		t.Fatalf("expected header plus one report row, got %+v", rows)
	}
	if got := rows[0]; strings.Join(got, "|") != strings.Join(expectedHeader, "|") {
		t.Fatalf("unexpected social reports csv header: %+v", got)
	}
	if got := rows[1]; got[2] != "mkt-social-admin" || got[5] != "'=low quality" || got[6] != "dismissed" || got[9] != "admin@taptrade.local" || got[10] != "Reviewed by trust queue." || got[11] != `'=HYPERLINK("https://example.invalid","review")` {
		t.Fatalf("unexpected social reports csv row: %+v", got)
	}
}

func TestMarketSocialAdminReportsRedactLegacyUnsafeTextOnRead(t *testing.T) {
	store := &memoryMarketSocialStore{
		reactions: map[string]map[string]struct{}{},
		reports:   map[string]map[string]socialReport{},
		follows:   map[string]map[string]struct{}{},
	}
	comment := marketComment{
		ID:        "legacy-comment-1",
		MarketID:  "mkt-social-legacy-report",
		UserID:    "u-legacy-commenter",
		Body:      "cash payout comment body",
		CreatedAt: "2026-06-30T18:40:00Z",
	}
	report := socialReport{
		ID:             socialReportID(comment.ID, "u-legacy-reporter"),
		CommentID:      comment.ID,
		MarketID:       comment.MarketID,
		CommentUserID:  comment.UserID,
		Body:           comment.Body,
		ReporterUserID: "u-legacy-reporter",
		Reason:         "crypto payout report reason",
		Status:         "reviewed",
		CreatedAt:      "2026-06-30T18:41:00Z",
		ReviewedAt:     "2026-06-30T18:42:00Z",
		ReviewedBy:     "admin@taptrade.local",
		ReviewNote:     "cash prize moderation note",
	}
	store.comments = []marketComment{comment}
	store.reports[comment.ID] = map[string]socialReport{report.ReporterUserID: report}

	mux := http.NewServeMux()
	registerMarketSocialAdminRoutes(mux, store)

	listReq := socialAdminContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/reports?status=all&limit=10", nil))
	listRes := httptest.NewRecorder()
	mux.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected reports list status 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}
	if store.reports[comment.ID][report.ReporterUserID].Reason != "crypto payout report reason" ||
		store.reports[comment.ID][report.ReporterUserID].ReviewNote != "cash prize moderation note" ||
		store.comments[0].Body != "cash payout comment body" {
		t.Fatalf("raw social report/comment storage should remain available for review: %+v comment=%+v", store.reports[comment.ID][report.ReporterUserID], store.comments[0])
	}
	var payload struct {
		Items []socialReport `json:"items"`
		Total int            `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode reports list payload: %v", err)
	}
	if payload.Total != 1 || len(payload.Items) != 1 {
		t.Fatalf("expected one report, got %+v", payload)
	}
	got := payload.Items[0]
	for _, unsafe := range []string{"cash payout", "crypto payout", "cash prize"} {
		if strings.Contains(got.Body, unsafe) ||
			strings.Contains(got.Reason, unsafe) ||
			strings.Contains(got.ReviewNote, unsafe) {
			t.Fatalf("admin report JSON leaked unsafe text %q: %+v", unsafe, got)
		}
	}
	if got.Body != launchRedactedUserText ||
		got.Reason != launchRedactedUserText ||
		got.ReviewNote != launchRedactedUserText {
		t.Fatalf("expected redacted report fields, got %+v", got)
	}

	csvReq := socialAdminContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/reports?status=all&format=csv&limit=10", nil))
	csvRes := httptest.NewRecorder()
	mux.ServeHTTP(csvRes, csvReq)
	if csvRes.Code != http.StatusOK {
		t.Fatalf("expected reports csv status 200, got %d body=%s", csvRes.Code, csvRes.Body.String())
	}
	rows, err := csv.NewReader(strings.NewReader(csvRes.Body.String())).ReadAll()
	if err != nil {
		t.Fatalf("read social reports csv: %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("expected header plus one report row, got %+v", rows)
	}
	csvRow := rows[1]
	if csvRow[5] != launchRedactedUserText ||
		csvRow[10] != launchRedactedUserText ||
		csvRow[11] != launchRedactedUserText {
		t.Fatalf("expected redacted CSV reason/review/body, got %+v", csvRow)
	}
	for _, unsafe := range []string{"cash payout", "crypto payout", "cash prize"} {
		if strings.Contains(csvRes.Body.String(), unsafe) {
			t.Fatalf("admin report CSV leaked unsafe text %q: %s", unsafe, csvRes.Body.String())
		}
	}
}

func TestMarketSocialAdminResolveNoteRejectsMoneyWording(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-unsafe-note/comments", bytes.NewBufferString(`{"body":"This comment needs review."}`)),
		"u-social-note-commenter",
	)
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d body=%s", createRes.Code, createRes.Body.String())
	}
	var createPayload struct {
		Comment marketComment `json:"comment"`
	}
	if err := json.Unmarshal(createRes.Body.Bytes(), &createPayload); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}

	reportReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/report", bytes.NewBufferString(`{"reason":"spam"}`)),
		"u-social-note-reporter",
	)
	reportRes := httptest.NewRecorder()
	handler.ServeHTTP(reportRes, reportReq)
	if reportRes.Code != http.StatusOK {
		t.Fatalf("expected report status 200, got %d body=%s", reportRes.Code, reportRes.Body.String())
	}

	listReq := socialAdminContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/reports?limit=10", nil))
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected reports list status 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []socialReport `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode reports list payload: %v", err)
	}
	if len(listPayload.Items) != 1 {
		t.Fatalf("expected one report, got %+v", listPayload.Items)
	}
	report := listPayload.Items[0]

	resolveReq := socialAdminContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/admin/social/reports/"+report.ID+"/resolve", bytes.NewBufferString(`{"status":"reviewed","note":"cash payout moderation note"}`)),
	)
	resolveRes := httptest.NewRecorder()
	handler.ServeHTTP(resolveRes, resolveReq)
	if resolveRes.Code != http.StatusBadRequest {
		t.Fatalf("expected unsafe social review note to return 400, got %d body=%s", resolveRes.Code, resolveRes.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(resolveRes.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode social review note error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "note" {
		t.Fatalf("expected note error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(resolveRes.Body.String(), "cash payout") {
		t.Fatalf("unsafe social review note should not be echoed: %s", resolveRes.Body.String())
	}

	openReq := socialAdminContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/reports?status=open&limit=10", nil))
	openRes := httptest.NewRecorder()
	handler.ServeHTTP(openRes, openReq)
	if openRes.Code != http.StatusOK {
		t.Fatalf("expected open reports status 200, got %d body=%s", openRes.Code, openRes.Body.String())
	}
	var openPayload struct {
		Items []socialReport `json:"items"`
		Total int            `json:"total"`
	}
	if err := json.Unmarshal(openRes.Body.Bytes(), &openPayload); err != nil {
		t.Fatalf("decode open reports payload: %v", err)
	}
	if openPayload.Total != 1 || len(openPayload.Items) != 1 || openPayload.Items[0].Status != "open" || openPayload.Items[0].ReviewNote != "" {
		t.Fatalf("unsafe note should not resolve or annotate report, got %+v", openPayload)
	}
}

func TestMarketSocialCommentBodyRejectsMoneyWording(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-unsafe-body/comments", bytes.NewBufferString(`{"body":"cash payout thread"}`)),
		"u-social-unsafe-body",
	)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected unsafe social comment status 400, got %d body=%s", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe social comment error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "body" {
		t.Fatalf("expected body error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "cash payout") {
		t.Fatalf("unsafe social comment should not be echoed: %s", res.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/social/markets/mkt-social-unsafe-body/comments?limit=10", nil)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected comment list status 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []marketComment `json:"items"`
		Total int             `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode comment list: %v", err)
	}
	if listPayload.Total != 0 || len(listPayload.Items) != 0 {
		t.Fatalf("unsafe social comment should not be persisted, got %+v", listPayload)
	}
}

func TestMarketSocialReportReasonRejectsMoneyWording(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-unsafe-report/comments", bytes.NewBufferString(`{"body":"This comment needs review."}`)),
		"u-social-report-commenter",
	)
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d body=%s", createRes.Code, createRes.Body.String())
	}
	var createPayload struct {
		Comment marketComment `json:"comment"`
	}
	if err := json.Unmarshal(createRes.Body.Bytes(), &createPayload); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}

	reportReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/report", bytes.NewBufferString(`{"reason":"crypto prize spam"}`)),
		"u-social-report-reporter",
	)
	reportRes := httptest.NewRecorder()
	handler.ServeHTTP(reportRes, reportReq)
	if reportRes.Code != http.StatusBadRequest {
		t.Fatalf("expected unsafe report reason status 400, got %d body=%s", reportRes.Code, reportRes.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(reportRes.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe report reason error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "reason" {
		t.Fatalf("expected reason error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(reportRes.Body.String(), "crypto prize") {
		t.Fatalf("unsafe report reason should not be echoed: %s", reportRes.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/social/markets/mkt-social-unsafe-report/comments?limit=10", nil)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected comment list status 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []marketComment `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode comment list: %v", err)
	}
	if len(listPayload.Items) != 1 || listPayload.Items[0].ReportCount != 0 {
		t.Fatalf("unsafe report reason should not create report, got %+v", listPayload.Items)
	}
}

func TestMarketSocialPublicReadsRedactLegacyUnsafeUserText(t *testing.T) {
	store := newMarketSocialStore(nil)
	comment, err := store.CreateComment(context.Background(), "mkt-social-legacy-copy", "", "u-legacy-copy", "cash payout legacy comment", nil)
	if err != nil {
		t.Fatalf("seed legacy unsafe comment: %v", err)
	}
	if comment.Body != "cash payout legacy comment" {
		t.Fatalf("store should retain raw moderation text, got %+v", comment)
	}

	mux := http.NewServeMux()
	registerMarketSocialRoutes(mux, store, nil, nil, nil)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	commentReq := httptest.NewRequest(http.MethodGet, "/api/v1/social/markets/mkt-social-legacy-copy/comments?limit=10", nil)
	commentRes := httptest.NewRecorder()
	handler.ServeHTTP(commentRes, commentReq)
	if commentRes.Code != http.StatusOK {
		t.Fatalf("expected comment list status 200, got %d body=%s", commentRes.Code, commentRes.Body.String())
	}
	var commentPayload struct {
		Items []marketComment `json:"items"`
	}
	if err := json.Unmarshal(commentRes.Body.Bytes(), &commentPayload); err != nil {
		t.Fatalf("decode comment list: %v", err)
	}
	if len(commentPayload.Items) != 1 || commentPayload.Items[0].Body != launchRedactedUserText {
		t.Fatalf("expected public comment body redaction, got %+v", commentPayload.Items)
	}
	if strings.Contains(commentRes.Body.String(), "cash payout") {
		t.Fatalf("public comment response leaked unsafe legacy text: %s", commentRes.Body.String())
	}

	activityReq := httptest.NewRequest(http.MethodGet, "/api/v1/social/activity?limit=10", nil)
	activityRes := httptest.NewRecorder()
	handler.ServeHTTP(activityRes, activityReq)
	if activityRes.Code != http.StatusOK {
		t.Fatalf("expected global activity status 200, got %d body=%s", activityRes.Code, activityRes.Body.String())
	}
	var activityPayload struct {
		Items []socialActivityItem `json:"items"`
	}
	if err := json.Unmarshal(activityRes.Body.Bytes(), &activityPayload); err != nil {
		t.Fatalf("decode global activity: %v", err)
	}
	if len(activityPayload.Items) != 1 || activityPayload.Items[0].Body != launchRedactedUserText {
		t.Fatalf("expected global activity redaction, got %+v", activityPayload.Items)
	}
	if strings.Contains(activityRes.Body.String(), "cash payout") {
		t.Fatalf("global activity response leaked unsafe legacy text: %s", activityRes.Body.String())
	}

	userReq := httptest.NewRequest(http.MethodGet, "/api/v1/social/users/u-legacy-copy/activity?limit=10", nil)
	userRes := httptest.NewRecorder()
	handler.ServeHTTP(userRes, userReq)
	if userRes.Code != http.StatusOK {
		t.Fatalf("expected user activity status 200, got %d body=%s", userRes.Code, userRes.Body.String())
	}
	if strings.Contains(userRes.Body.String(), "cash payout") || !strings.Contains(userRes.Body.String(), launchRedactedUserText) {
		t.Fatalf("user activity should redact unsafe legacy text, got %s", userRes.Body.String())
	}
}

func TestMarketSocialPublicProfileRedactsUnsafeDisplayNameWithoutMutatingProfile(t *testing.T) {
	profile := publicUserProfile{
		UserID:          "u-legacy-profile",
		DisplayName:     "Cash payout profile",
		CommentCount:    3,
		FollowerCount:   2,
		FollowingCount:  1,
		ViewerFollowing: true,
		LastActiveAt:    "2026-06-30T19:00:00Z",
	}

	payload := publicUserProfilePayload(profile)

	if payload.DisplayName != launchRedactedUserText {
		t.Fatalf("expected unsafe profile displayName redacted, got %+v", payload)
	}
	if payload.UserID != profile.UserID ||
		payload.CommentCount != profile.CommentCount ||
		payload.FollowerCount != profile.FollowerCount ||
		payload.FollowingCount != profile.FollowingCount ||
		payload.ViewerFollowing != profile.ViewerFollowing ||
		payload.LastActiveAt != profile.LastActiveAt {
		t.Fatalf("profile redaction should preserve non-display fields, got %+v", payload)
	}
	if profile.DisplayName != "Cash payout profile" {
		t.Fatalf("publicUserProfilePayload must not mutate raw profile, got %+v", profile)
	}
}

func TestMarketSocialRewardActivityDoesNotEchoLedgerReason(t *testing.T) {
	source, err := os.ReadFile("market_social_handlers.go")
	if err != nil {
		t.Fatalf("read market social handler source: %v", err)
	}
	body := string(source)
	if !strings.Contains(body, "FROM loyalty_ledger") {
		t.Fatal("expected social activity feed to include loyalty ledger rows")
	}
	for _, unsafe := range []string{
		"reward points - ' || reason",
		"points - ' || reason",
		"|| reason",
	} {
		if strings.Contains(body, unsafe) {
			t.Fatalf("reward activity must not echo raw ledger reason via %q", unsafe)
		}
	}
	for _, safe := range []string{
		"'Earned ' || delta_points::text || ' reward points'",
		"'Reward adjustment ' || delta_points::text || ' points'",
	} {
		if !strings.Contains(body, safe) {
			t.Fatalf("reward activity missing point-safe body expression %q", safe)
		}
	}
}

func TestMarketSocialCreateRequiresSessionUser(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-2/comments", bytes.NewBufferString(`{"body":"hello"}`))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected unauthenticated create status 403, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestMarketSocialCommentRateLimitBlocksBurst(t *testing.T) {
	t.Setenv("SOCIAL_WRITE_RATE_LIMIT_PER_MIN", "1")
	t.Setenv("SOCIAL_WRITE_RATE_LIMIT_BURST", "1")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	firstReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-rate/comments", bytes.NewBufferString(`{"body":"First useful comment."}`)),
		"u-social-rate-1",
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusCreated {
		t.Fatalf("expected first create status 201, got %d body=%s", firstRes.Code, firstRes.Body.String())
	}

	secondReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-rate/comments", bytes.NewBufferString(`{"body":"Second burst comment."}`)),
		"u-social-rate-1",
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusTooManyRequests {
		t.Fatalf("expected second create status 429, got %d body=%s", secondRes.Code, secondRes.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/social/markets/mkt-social-rate/comments?limit=10", nil)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []marketComment `json:"items"`
		Total int             `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode list payload: %v", err)
	}
	if listPayload.Total != 1 || len(listPayload.Items) != 1 {
		t.Fatalf("expected only first comment to persist, got total=%d items=%+v", listPayload.Total, listPayload.Items)
	}
}

func TestMarketSocialIPRateLimitBlocksMultiAccountBurst(t *testing.T) {
	t.Setenv("SOCIAL_WRITE_IP_RATE_LIMIT_PER_MIN", "1")
	t.Setenv("SOCIAL_WRITE_IP_RATE_LIMIT_BURST", "1")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	firstReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-ip-rate/comments", bytes.NewBufferString(`{"body":"First shared-IP account."}`)),
		"u-social-ip-1",
	)
	firstReq.Header.Set("X-Forwarded-For", "203.0.113.9")
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusCreated {
		t.Fatalf("expected first comment status 201, got %d body=%s", firstRes.Code, firstRes.Body.String())
	}

	blockedReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-ip-rate/comments", bytes.NewBufferString(`{"body":"Second shared-IP account."}`)),
		"u-social-ip-2",
	)
	blockedReq.Header.Set("X-Forwarded-For", "203.0.113.9")
	blockedRes := httptest.NewRecorder()
	handler.ServeHTTP(blockedRes, blockedReq)
	if blockedRes.Code != http.StatusTooManyRequests {
		t.Fatalf("expected same-IP second account status 429, got %d body=%s", blockedRes.Code, blockedRes.Body.String())
	}

	differentIPReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-ip-rate/comments", bytes.NewBufferString(`{"body":"Different IP account."}`)),
		"u-social-ip-2",
	)
	differentIPReq.Header.Set("X-Forwarded-For", "203.0.113.10")
	differentIPRes := httptest.NewRecorder()
	handler.ServeHTTP(differentIPRes, differentIPReq)
	if differentIPRes.Code != http.StatusCreated {
		t.Fatalf("expected different-IP comment status 201, got %d body=%s", differentIPRes.Code, differentIPRes.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/social/markets/mkt-social-ip-rate/comments?limit=10", nil)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []marketComment `json:"items"`
		Total int             `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode list payload: %v", err)
	}
	if listPayload.Total != 2 || len(listPayload.Items) != 2 {
		t.Fatalf("expected only allowed comments to persist, got total=%d items=%+v", listPayload.Total, listPayload.Items)
	}
}

func TestMarketSocialIPRateLimitBlocksMultiAccountReports(t *testing.T) {
	t.Setenv("SOCIAL_WRITE_IP_RATE_LIMIT_PER_MIN", "1")
	t.Setenv("SOCIAL_WRITE_IP_RATE_LIMIT_BURST", "1")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-ip-report/comments", bytes.NewBufferString(`{"body":"This should stay reviewable."}`)),
		"u-social-ip-report-author",
	)
	createReq.Header.Set("X-Forwarded-For", "203.0.113.20")
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d body=%s", createRes.Code, createRes.Body.String())
	}
	var createPayload struct {
		Comment marketComment `json:"comment"`
	}
	if err := json.Unmarshal(createRes.Body.Bytes(), &createPayload); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}

	firstReportReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/report", bytes.NewBufferString(`{"reason":"spam"}`)),
		"u-social-ip-report-1",
	)
	firstReportReq.Header.Set("X-Forwarded-For", "203.0.113.21")
	firstReportRes := httptest.NewRecorder()
	handler.ServeHTTP(firstReportRes, firstReportReq)
	if firstReportRes.Code != http.StatusOK {
		t.Fatalf("expected first report status 200, got %d body=%s", firstReportRes.Code, firstReportRes.Body.String())
	}

	blockedReportReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/report", bytes.NewBufferString(`{"reason":"repeat spam"}`)),
		"u-social-ip-report-2",
	)
	blockedReportReq.Header.Set("X-Forwarded-For", "203.0.113.21")
	blockedReportRes := httptest.NewRecorder()
	handler.ServeHTTP(blockedReportRes, blockedReportReq)
	if blockedReportRes.Code != http.StatusTooManyRequests {
		t.Fatalf("expected same-IP second report status 429, got %d body=%s", blockedReportRes.Code, blockedReportRes.Body.String())
	}

	differentIPReportReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/report", bytes.NewBufferString(`{"reason":"different ip spam"}`)),
		"u-social-ip-report-2",
	)
	differentIPReportReq.Header.Set("X-Forwarded-For", "203.0.113.22")
	differentIPReportRes := httptest.NewRecorder()
	handler.ServeHTTP(differentIPReportRes, differentIPReportReq)
	if differentIPReportRes.Code != http.StatusOK {
		t.Fatalf("expected different-IP report status 200, got %d body=%s", differentIPReportRes.Code, differentIPReportRes.Body.String())
	}

	listReportsReq := socialAdminContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/reports?limit=10", nil))
	listReportsRes := httptest.NewRecorder()
	handler.ServeHTTP(listReportsRes, listReportsReq)
	if listReportsRes.Code != http.StatusOK {
		t.Fatalf("expected reports list status 200, got %d body=%s", listReportsRes.Code, listReportsRes.Body.String())
	}
	var reportsPayload struct {
		Items []socialReport `json:"items"`
		Total int            `json:"total"`
	}
	if err := json.Unmarshal(listReportsRes.Body.Bytes(), &reportsPayload); err != nil {
		t.Fatalf("decode reports payload: %v", err)
	}
	if reportsPayload.Total != 2 {
		t.Fatalf("expected only allowed reports to persist, got %+v", reportsPayload)
	}
}

func TestMarketSocialIPRateLimitBlocksMultiAccountReactions(t *testing.T) {
	t.Setenv("SOCIAL_WRITE_IP_RATE_LIMIT_PER_MIN", "1")
	t.Setenv("SOCIAL_WRITE_IP_RATE_LIMIT_BURST", "1")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-ip-react/comments", bytes.NewBufferString(`{"body":"React to this market note."}`)),
		"u-social-ip-react-author",
	)
	createReq.Header.Set("X-Forwarded-For", "203.0.113.40")
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d body=%s", createRes.Code, createRes.Body.String())
	}
	var createPayload struct {
		Comment marketComment `json:"comment"`
	}
	if err := json.Unmarshal(createRes.Body.Bytes(), &createPayload); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}

	firstReactReq := socialUserContext(httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/react", nil), "u-social-ip-react-1")
	firstReactReq.Header.Set("X-Forwarded-For", "203.0.113.41")
	firstReactRes := httptest.NewRecorder()
	handler.ServeHTTP(firstReactRes, firstReactReq)
	if firstReactRes.Code != http.StatusOK {
		t.Fatalf("expected first react status 200, got %d body=%s", firstReactRes.Code, firstReactRes.Body.String())
	}

	blockedReactReq := socialUserContext(httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/react", nil), "u-social-ip-react-2")
	blockedReactReq.Header.Set("X-Forwarded-For", "203.0.113.41")
	blockedReactRes := httptest.NewRecorder()
	handler.ServeHTTP(blockedReactRes, blockedReactReq)
	if blockedReactRes.Code != http.StatusTooManyRequests {
		t.Fatalf("expected same-IP second react status 429, got %d body=%s", blockedReactRes.Code, blockedReactRes.Body.String())
	}

	differentIPReactReq := socialUserContext(httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/react", nil), "u-social-ip-react-2")
	differentIPReactReq.Header.Set("X-Forwarded-For", "203.0.113.42")
	differentIPReactRes := httptest.NewRecorder()
	handler.ServeHTTP(differentIPReactRes, differentIPReactReq)
	if differentIPReactRes.Code != http.StatusOK {
		t.Fatalf("expected different-IP react status 200, got %d body=%s", differentIPReactRes.Code, differentIPReactRes.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/social/markets/mkt-social-ip-react/comments?limit=10", nil)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []marketComment `json:"items"`
		Total int             `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode list payload: %v", err)
	}
	if listPayload.Total != 1 || len(listPayload.Items) != 1 || listPayload.Items[0].ReactionCount != 2 {
		t.Fatalf("expected only allowed reactions to persist, got %+v", listPayload)
	}
}

func TestMarketSocialIPRateLimitBlocksMultiAccountFollows(t *testing.T) {
	t.Setenv("SOCIAL_WRITE_IP_RATE_LIMIT_PER_MIN", "1")
	t.Setenv("SOCIAL_WRITE_IP_RATE_LIMIT_BURST", "1")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	firstFollowReq := socialUserContext(httptest.NewRequest(http.MethodPost, "/api/v1/social/users/u-social-ip-follow-target/follow", nil), "u-social-ip-follow-1")
	firstFollowReq.Header.Set("X-Forwarded-For", "203.0.113.30")
	firstFollowRes := httptest.NewRecorder()
	handler.ServeHTTP(firstFollowRes, firstFollowReq)
	if firstFollowRes.Code != http.StatusOK {
		t.Fatalf("expected first follow status 200, got %d body=%s", firstFollowRes.Code, firstFollowRes.Body.String())
	}

	blockedFollowReq := socialUserContext(httptest.NewRequest(http.MethodPost, "/api/v1/social/users/u-social-ip-follow-target/follow", nil), "u-social-ip-follow-2")
	blockedFollowReq.Header.Set("X-Forwarded-For", "203.0.113.30")
	blockedFollowRes := httptest.NewRecorder()
	handler.ServeHTTP(blockedFollowRes, blockedFollowReq)
	if blockedFollowRes.Code != http.StatusTooManyRequests {
		t.Fatalf("expected same-IP second follow status 429, got %d body=%s", blockedFollowRes.Code, blockedFollowRes.Body.String())
	}

	differentIPFollowReq := socialUserContext(httptest.NewRequest(http.MethodPost, "/api/v1/social/users/u-social-ip-follow-target/follow", nil), "u-social-ip-follow-2")
	differentIPFollowReq.Header.Set("X-Forwarded-For", "203.0.113.31")
	differentIPFollowRes := httptest.NewRecorder()
	handler.ServeHTTP(differentIPFollowRes, differentIPFollowReq)
	if differentIPFollowRes.Code != http.StatusOK {
		t.Fatalf("expected different-IP follow status 200, got %d body=%s", differentIPFollowRes.Code, differentIPFollowRes.Body.String())
	}

	profileReq := socialUserContext(httptest.NewRequest(http.MethodGet, "/api/v1/social/users/u-social-ip-follow-target/profile", nil), "u-social-ip-follow-2")
	profileRes := httptest.NewRecorder()
	handler.ServeHTTP(profileRes, profileReq)
	if profileRes.Code != http.StatusOK {
		t.Fatalf("expected profile status 200, got %d body=%s", profileRes.Code, profileRes.Body.String())
	}
	var profilePayload struct {
		Profile publicUserProfile `json:"profile"`
	}
	if err := json.Unmarshal(profileRes.Body.Bytes(), &profilePayload); err != nil {
		t.Fatalf("decode profile payload: %v", err)
	}
	if profilePayload.Profile.FollowerCount != 2 {
		t.Fatalf("expected only allowed follows to persist, got %+v", profilePayload.Profile)
	}
}

func TestMarketSocialReportRateLimitBlocksBurst(t *testing.T) {
	t.Setenv("SOCIAL_WRITE_RATE_LIMIT_PER_MIN", "1")
	t.Setenv("SOCIAL_WRITE_RATE_LIMIT_BURST", "1")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-report-rate/comments", bytes.NewBufferString(`{"body":"Please moderate carefully."}`)),
		"u-social-report-author",
	)
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d body=%s", createRes.Code, createRes.Body.String())
	}
	var createPayload struct {
		Comment marketComment `json:"comment"`
	}
	if err := json.Unmarshal(createRes.Body.Bytes(), &createPayload); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}

	firstReportReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/report", bytes.NewBufferString(`{"reason":"spam"}`)),
		"u-social-report-rate",
	)
	firstReportRes := httptest.NewRecorder()
	handler.ServeHTTP(firstReportRes, firstReportReq)
	if firstReportRes.Code != http.StatusOK {
		t.Fatalf("expected first report status 200, got %d body=%s", firstReportRes.Code, firstReportRes.Body.String())
	}

	secondReportReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/comments/"+createPayload.Comment.ID+"/report", bytes.NewBufferString(`{"reason":"repeat spam"}`)),
		"u-social-report-rate",
	)
	secondReportRes := httptest.NewRecorder()
	handler.ServeHTTP(secondReportRes, secondReportReq)
	if secondReportRes.Code != http.StatusTooManyRequests {
		t.Fatalf("expected second report status 429, got %d body=%s", secondReportRes.Code, secondReportRes.Body.String())
	}

	listReportsReq := socialAdminContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/reports?limit=10", nil))
	listReportsRes := httptest.NewRecorder()
	handler.ServeHTTP(listReportsRes, listReportsReq)
	if listReportsRes.Code != http.StatusOK {
		t.Fatalf("expected reports list status 200, got %d body=%s", listReportsRes.Code, listReportsRes.Body.String())
	}
	var reportsPayload struct {
		Items []socialReport `json:"items"`
		Total int            `json:"total"`
	}
	if err := json.Unmarshal(listReportsRes.Body.Bytes(), &reportsPayload); err != nil {
		t.Fatalf("decode reports payload: %v", err)
	}
	if reportsPayload.Total != 1 || reportsPayload.Items[0].Reason != "spam" {
		t.Fatalf("expected only first report to persist, got %+v", reportsPayload)
	}
}

func TestMarketSocialProfilesFollowsAndActivity(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "false")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := socialUserContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/social/markets/mkt-social-activity/comments", bytes.NewBufferString(`{"body":"=Tracking this market."}`)),
		"u-profile-1",
	)
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d body=%s", createRes.Code, createRes.Body.String())
	}

	followReq := socialUserContext(httptest.NewRequest(http.MethodPost, "/api/v1/social/users/u-profile-1/follow", nil), "u-profile-2")
	followRes := httptest.NewRecorder()
	handler.ServeHTTP(followRes, followReq)
	if followRes.Code != http.StatusOK {
		t.Fatalf("expected follow status 200, got %d body=%s", followRes.Code, followRes.Body.String())
	}
	followAgainReq := socialUserContext(httptest.NewRequest(http.MethodPost, "/api/v1/social/users/u-profile-1/follow", nil), "u-profile-2")
	followAgainRes := httptest.NewRecorder()
	handler.ServeHTTP(followAgainRes, followAgainReq)
	if followAgainRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate follow status 200, got %d body=%s", followAgainRes.Code, followAgainRes.Body.String())
	}

	var followPayload struct {
		Profile publicUserProfile `json:"profile"`
	}
	if err := json.Unmarshal(followAgainRes.Body.Bytes(), &followPayload); err != nil {
		t.Fatalf("decode follow payload: %v", err)
	}
	if followPayload.Profile.FollowerCount != 1 || !followPayload.Profile.ViewerFollowing {
		t.Fatalf("expected one idempotent follower and viewerFollowing=true, got %+v", followPayload.Profile)
	}

	profileReq := socialUserContext(httptest.NewRequest(http.MethodGet, "/api/v1/social/users/u-profile-1/profile", nil), "u-profile-2")
	profileRes := httptest.NewRecorder()
	handler.ServeHTTP(profileRes, profileReq)
	if profileRes.Code != http.StatusOK {
		t.Fatalf("expected profile status 200, got %d body=%s", profileRes.Code, profileRes.Body.String())
	}
	var profilePayload struct {
		Profile publicUserProfile `json:"profile"`
	}
	if err := json.Unmarshal(profileRes.Body.Bytes(), &profilePayload); err != nil {
		t.Fatalf("decode profile payload: %v", err)
	}
	if profilePayload.Profile.CommentCount != 1 || profilePayload.Profile.FollowerCount != 1 {
		t.Fatalf("expected comment/follower counts, got %+v", profilePayload.Profile)
	}

	userActivityReq := httptest.NewRequest(http.MethodGet, "/api/v1/social/users/u-profile-1/activity?limit=10", nil)
	userActivityRes := httptest.NewRecorder()
	handler.ServeHTTP(userActivityRes, userActivityReq)
	if userActivityRes.Code != http.StatusOK {
		t.Fatalf("expected user activity status 200, got %d body=%s", userActivityRes.Code, userActivityRes.Body.String())
	}
	var userActivityPayload struct {
		Items []socialActivityItem `json:"items"`
		Total int                  `json:"total"`
	}
	if err := json.Unmarshal(userActivityRes.Body.Bytes(), &userActivityPayload); err != nil {
		t.Fatalf("decode user activity payload: %v", err)
	}
	if userActivityPayload.Total != 2 {
		t.Fatalf("expected comment plus follow activity, got total=%d items=%+v", userActivityPayload.Total, userActivityPayload.Items)
	}

	globalActivityReq := httptest.NewRequest(http.MethodGet, "/api/v1/social/activity?limit=10", nil)
	globalActivityRes := httptest.NewRecorder()
	handler.ServeHTTP(globalActivityRes, globalActivityReq)
	if globalActivityRes.Code != http.StatusOK {
		t.Fatalf("expected global activity status 200, got %d body=%s", globalActivityRes.Code, globalActivityRes.Body.String())
	}
	var globalActivityPayload struct {
		Items []socialActivityItem `json:"items"`
		Total int                  `json:"total"`
	}
	if err := json.Unmarshal(globalActivityRes.Body.Bytes(), &globalActivityPayload); err != nil {
		t.Fatalf("decode global activity payload: %v", err)
	}
	if globalActivityPayload.Total < 2 {
		t.Fatalf("expected global activity to include social actions, got %+v", globalActivityPayload)
	}

	anonAdminActivityReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/activity?limit=10", nil)
	anonAdminActivityRes := httptest.NewRecorder()
	handler.ServeHTTP(anonAdminActivityRes, anonAdminActivityReq)
	if anonAdminActivityRes.Code != http.StatusForbidden {
		t.Fatalf("expected non-admin activity export status 403, got %d body=%s", anonAdminActivityRes.Code, anonAdminActivityRes.Body.String())
	}

	adminActivityReq := socialAdminContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/activity?limit=10", nil))
	adminActivityRes := httptest.NewRecorder()
	handler.ServeHTTP(adminActivityRes, adminActivityReq)
	if adminActivityRes.Code != http.StatusOK {
		t.Fatalf("expected admin activity status 200, got %d body=%s", adminActivityRes.Code, adminActivityRes.Body.String())
	}
	var adminActivityPayload struct {
		Items []socialActivityItem `json:"items"`
		Total int                  `json:"total"`
	}
	if err := json.Unmarshal(adminActivityRes.Body.Bytes(), &adminActivityPayload); err != nil {
		t.Fatalf("decode admin activity payload: %v", err)
	}
	if adminActivityPayload.Total < 2 {
		t.Fatalf("expected admin activity to include social actions, got %+v", adminActivityPayload)
	}

	csvReq := socialAdminContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/social/activity?limit=10&format=csv", nil))
	csvRes := httptest.NewRecorder()
	handler.ServeHTTP(csvRes, csvReq)
	if csvRes.Code != http.StatusOK {
		t.Fatalf("expected admin activity csv status 200, got %d body=%s", csvRes.Code, csvRes.Body.String())
	}
	if ct := csvRes.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/csv") {
		t.Fatalf("expected text/csv content type, got %q", ct)
	}
	if cd := csvRes.Header().Get("Content-Disposition"); !strings.Contains(cd, `filename="prediction-social-activity.csv"`) {
		t.Fatalf("expected social activity csv filename, got %q", cd)
	}
	rows, err := csv.NewReader(strings.NewReader(csvRes.Body.String())).ReadAll()
	if err != nil {
		t.Fatalf("read social activity csv: %v", err)
	}
	expectedHeader := []string{"activity_id", "type", "user_id", "target_id", "market_id", "comment_id", "body", "created_at"}
	if len(rows) < 3 {
		t.Fatalf("expected header plus activity rows, got %+v", rows)
	}
	if got := rows[0]; strings.Join(got, "|") != strings.Join(expectedHeader, "|") {
		t.Fatalf("unexpected social activity csv header: %+v", got)
	}
	foundComment := false
	for _, row := range rows[1:] {
		if len(row) != len(expectedHeader) {
			t.Fatalf("unexpected social activity csv row width: %+v", row)
		}
		if row[1] == "comment" && row[4] == "mkt-social-activity" && row[6] == "'=Tracking this market." {
			foundComment = true
		}
	}
	if !foundComment {
		t.Fatalf("expected formula-safe comment activity row, got %+v", rows)
	}
}

func TestMarketSocialCannotFollowSelf(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := socialUserContext(httptest.NewRequest(http.MethodPost, "/api/v1/social/users/u-profile-self/follow", nil), "u-profile-self")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected self-follow status 400, got %d body=%s", res.Code, res.Body.String())
	}
}
