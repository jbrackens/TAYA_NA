package http

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	stdhttp "net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"taptrade/platform/transport/httpx"
)

type marketComment struct {
	ID            string `json:"id"`
	MarketID      string `json:"marketId"`
	ParentID      string `json:"parentId,omitempty"`
	UserID        string `json:"userId"`
	Body          string `json:"body"`
	ReactionCount int    `json:"reactionCount"`
	ReportCount   int    `json:"reportCount"`
	CreatedAt     string `json:"createdAt"`
}

type marketCommentCreateRequest struct {
	Body     string `json:"body"`
	ParentID string `json:"parentId"`
}

type marketCommentReportRequest struct {
	Reason string `json:"reason"`
}

type socialReport struct {
	ID             string `json:"id"`
	CommentID      string `json:"commentId"`
	MarketID       string `json:"marketId"`
	CommentUserID  string `json:"commentUserId"`
	Body           string `json:"body"`
	ReporterUserID string `json:"reporterUserId"`
	Reason         string `json:"reason"`
	Status         string `json:"status"`
	CreatedAt      string `json:"createdAt"`
	ReviewedAt     string `json:"reviewedAt,omitempty"`
	ReviewedBy     string `json:"reviewedBy,omitempty"`
	ReviewNote     string `json:"reviewNote,omitempty"`
}

type socialReportResolveRequest struct {
	Status string `json:"status"`
	Note   string `json:"note"`
}

type publicUserProfile struct {
	UserID          string `json:"userId"`
	DisplayName     string `json:"displayName"`
	CommentCount    int    `json:"commentCount"`
	FollowerCount   int    `json:"followerCount"`
	FollowingCount  int    `json:"followingCount"`
	ViewerFollowing bool   `json:"viewerFollowing"`
	LastActiveAt    string `json:"lastActiveAt,omitempty"`
}

type socialActivityItem struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	UserID    string `json:"userId"`
	TargetID  string `json:"targetId,omitempty"`
	MarketID  string `json:"marketId,omitempty"`
	CommentID string `json:"commentId,omitempty"`
	Body      string `json:"body,omitempty"`
	CreatedAt string `json:"createdAt"`
}

var errCannotFollowSelf = errors.New("cannot follow self")

type marketSocialStore interface {
	ListComments(ctx context.Context, marketID string, limit int) ([]marketComment, error)
	CreateComment(ctx context.Context, marketID, parentID, userID, body string) (marketComment, error)
	React(ctx context.Context, commentID, userID string) (marketComment, error)
	Report(ctx context.Context, commentID, userID, reason string) (marketComment, error)
	ListReports(ctx context.Context, status string, limit int) ([]socialReport, error)
	ResolveReport(ctx context.Context, reportID, adminID, status, note string) error
	PublicProfile(ctx context.Context, userID, viewerID string) (publicUserProfile, error)
	Follow(ctx context.Context, targetUserID, followerUserID string) (publicUserProfile, error)
	UserActivity(ctx context.Context, userID string, limit int) ([]socialActivityItem, error)
	GlobalActivity(ctx context.Context, limit int) ([]socialActivityItem, error)
}

type memoryMarketSocialStore struct {
	mu        sync.Mutex
	sequence  int64
	comments  []marketComment
	reactions map[string]map[string]struct{}
	reports   map[string]map[string]socialReport
	follows   map[string]map[string]struct{}
	activity  []socialActivityItem
}

func newMarketSocialStore(db *sql.DB) marketSocialStore {
	if db != nil {
		return newSQLMarketSocialStore(db)
	}
	return &memoryMarketSocialStore{
		reactions: map[string]map[string]struct{}{},
		reports:   map[string]map[string]socialReport{},
		follows:   map[string]map[string]struct{}{},
	}
}

func publicMarketCommentPayload(comment marketComment) marketComment {
	comment.Body = redactLaunchProhibitedUserText(comment.Body)
	return comment
}

func publicMarketCommentPayloads(comments []marketComment) []marketComment {
	out := make([]marketComment, 0, len(comments))
	for _, comment := range comments {
		out = append(out, publicMarketCommentPayload(comment))
	}
	return out
}

func publicSocialActivityPayload(item socialActivityItem) socialActivityItem {
	item.Body = redactLaunchProhibitedUserText(item.Body)
	return item
}

func publicSocialActivityPayloads(items []socialActivityItem) []socialActivityItem {
	out := make([]socialActivityItem, 0, len(items))
	for _, item := range items {
		out = append(out, publicSocialActivityPayload(item))
	}
	return out
}

func publicUserProfilePayload(profile publicUserProfile) publicUserProfile {
	profile.DisplayName = redactLaunchProhibitedUserText(profile.DisplayName)
	return profile
}

func adminSocialReportPayload(report socialReport) socialReport {
	report.Body = redactLaunchProhibitedUserText(report.Body)
	report.Reason = redactLaunchProhibitedUserText(report.Reason)
	report.ReviewNote = redactLaunchProhibitedUserText(report.ReviewNote)
	return report
}

func adminSocialReportPayloads(reports []socialReport) []socialReport {
	out := make([]socialReport, 0, len(reports))
	for _, report := range reports {
		out = append(out, adminSocialReportPayload(report))
	}
	return out
}

func (s *memoryMarketSocialStore) ListComments(_ context.Context, marketID string, limit int) ([]marketComment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows := make([]marketComment, 0, limit)
	for i := len(s.comments) - 1; i >= 0 && len(rows) < limit; i-- {
		if s.comments[i].MarketID == marketID {
			rows = append(rows, s.comments[i])
		}
	}
	return rows, nil
}

func (s *memoryMarketSocialStore) CreateComment(_ context.Context, marketID, parentID, userID, body string) (marketComment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sequence++
	comment := marketComment{
		ID:        fmt.Sprintf("mc:%d", s.sequence),
		MarketID:  marketID,
		ParentID:  parentID,
		UserID:    userID,
		Body:      body,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	s.comments = append(s.comments, comment)
	s.activity = append(s.activity, socialActivityItem{
		ID:        "comment:" + comment.ID,
		Type:      "comment",
		UserID:    userID,
		MarketID:  marketID,
		CommentID: comment.ID,
		Body:      body,
		CreatedAt: comment.CreatedAt,
	})
	return comment, nil
}

func (s *memoryMarketSocialStore) React(_ context.Context, commentID, userID string) (marketComment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.reactions[commentID] == nil {
		s.reactions[commentID] = map[string]struct{}{}
	}
	s.reactions[commentID][userID] = struct{}{}
	for i := range s.comments {
		if s.comments[i].ID == commentID {
			s.comments[i].ReactionCount = len(s.reactions[commentID])
			return s.comments[i], nil
		}
	}
	return marketComment{}, sql.ErrNoRows
}

func (s *memoryMarketSocialStore) PublicProfile(_ context.Context, userID, viewerID string) (publicUserProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.publicProfileLocked(userID, viewerID), nil
}

func (s *memoryMarketSocialStore) Follow(_ context.Context, targetUserID, followerUserID string) (publicUserProfile, error) {
	if targetUserID == followerUserID {
		return publicUserProfile{}, errCannotFollowSelf
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.follows[targetUserID] == nil {
		s.follows[targetUserID] = map[string]struct{}{}
	}
	if _, found := s.follows[targetUserID][followerUserID]; !found {
		s.follows[targetUserID][followerUserID] = struct{}{}
		now := time.Now().UTC().Format(time.RFC3339)
		s.activity = append(s.activity, socialActivityItem{
			ID:        "follow:" + followerUserID + ":" + targetUserID,
			Type:      "follow",
			UserID:    followerUserID,
			TargetID:  targetUserID,
			CreatedAt: now,
		})
	}
	return s.publicProfileLocked(targetUserID, followerUserID), nil
}

func (s *memoryMarketSocialStore) UserActivity(_ context.Context, userID string, limit int) ([]socialActivityItem, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows := make([]socialActivityItem, 0, limit)
	for i := len(s.activity) - 1; i >= 0 && len(rows) < limit; i-- {
		if s.activity[i].UserID == userID || s.activity[i].TargetID == userID {
			rows = append(rows, s.activity[i])
		}
	}
	return rows, nil
}

func (s *memoryMarketSocialStore) GlobalActivity(_ context.Context, limit int) ([]socialActivityItem, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows := make([]socialActivityItem, 0, limit)
	for i := len(s.activity) - 1; i >= 0 && len(rows) < limit; i-- {
		rows = append(rows, s.activity[i])
	}
	return rows, nil
}

func (s *memoryMarketSocialStore) publicProfileLocked(userID, viewerID string) publicUserProfile {
	commentCount := 0
	var lastActive string
	for _, comment := range s.comments {
		if comment.UserID != userID {
			continue
		}
		commentCount++
		if comment.CreatedAt > lastActive {
			lastActive = comment.CreatedAt
		}
	}
	followingCount := 0
	for _, followers := range s.follows {
		if _, ok := followers[userID]; ok {
			followingCount++
		}
	}
	_, viewerFollowing := s.follows[userID][viewerID]
	return publicUserProfile{
		UserID:          userID,
		DisplayName:     userID,
		CommentCount:    commentCount,
		FollowerCount:   len(s.follows[userID]),
		FollowingCount:  followingCount,
		ViewerFollowing: viewerFollowing,
		LastActiveAt:    lastActive,
	}
}

func (s *memoryMarketSocialStore) Report(_ context.Context, commentID, userID, reason string) (marketComment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.reports[commentID] == nil {
		s.reports[commentID] = map[string]socialReport{}
	}
	for i := range s.comments {
		if s.comments[i].ID == commentID {
			now := time.Now().UTC().Format(time.RFC3339)
			report := s.reports[commentID][userID]
			report.ID = socialReportID(commentID, userID)
			report.CommentID = commentID
			report.MarketID = s.comments[i].MarketID
			report.CommentUserID = s.comments[i].UserID
			report.Body = s.comments[i].Body
			report.ReporterUserID = userID
			report.Reason = reason
			report.Status = "open"
			report.CreatedAt = now
			report.ReviewedAt = ""
			report.ReviewedBy = ""
			report.ReviewNote = ""
			s.reports[commentID][userID] = report
			s.comments[i].ReportCount = s.openReportCountLocked(commentID)
			return s.comments[i], nil
		}
	}
	return marketComment{}, sql.ErrNoRows
}

func (s *memoryMarketSocialStore) ListReports(_ context.Context, status string, limit int) ([]socialReport, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows := make([]socialReport, 0, limit)
	for i := len(s.comments) - 1; i >= 0 && len(rows) < limit; i-- {
		for _, report := range s.reports[s.comments[i].ID] {
			if status != "all" && report.Status != status {
				continue
			}
			report.MarketID = s.comments[i].MarketID
			report.CommentUserID = s.comments[i].UserID
			report.Body = s.comments[i].Body
			rows = append(rows, report)
			if len(rows) >= limit {
				break
			}
		}
	}
	return rows, nil
}

func (s *memoryMarketSocialStore) ResolveReport(_ context.Context, reportID, adminID, status, note string) error {
	commentID, reporterUserID, err := parseSocialReportID(reportID)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	report, ok := s.reports[commentID][reporterUserID]
	if !ok {
		return sql.ErrNoRows
	}
	report.Status = status
	report.ReviewedAt = time.Now().UTC().Format(time.RFC3339)
	report.ReviewedBy = adminID
	report.ReviewNote = note
	s.reports[commentID][reporterUserID] = report
	for i := range s.comments {
		if s.comments[i].ID == commentID {
			s.comments[i].ReportCount = s.openReportCountLocked(commentID)
			break
		}
	}
	return nil
}

func (s *memoryMarketSocialStore) openReportCountLocked(commentID string) int {
	count := 0
	for _, report := range s.reports[commentID] {
		if report.Status == "open" {
			count++
		}
	}
	return count
}

type sqlMarketSocialStore struct {
	db *sql.DB
}

func newSQLMarketSocialStore(db *sql.DB) *sqlMarketSocialStore {
	return &sqlMarketSocialStore{db: db}
}

func (s *sqlMarketSocialStore) ListComments(ctx context.Context, marketID string, limit int) ([]marketComment, error) {
	if err := s.ensureSchema(ctx); err != nil {
		return nil, err
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT c.id, c.market_id, COALESCE(c.parent_id, ''), c.user_id, c.body,
       COUNT(DISTINCT r.user_id), COUNT(DISTINCT p.user_id), c.created_at
FROM prediction_market_comments c
LEFT JOIN prediction_market_comment_reactions r ON r.comment_id = c.id
LEFT JOIN prediction_market_comment_reports p ON p.comment_id = c.id AND p.status = 'open'
WHERE c.market_id = $1
GROUP BY c.id, c.market_id, c.parent_id, c.user_id, c.body, c.created_at
ORDER BY c.created_at DESC
LIMIT $2`, marketID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	comments := []marketComment{}
	for rows.Next() {
		var c marketComment
		var created time.Time
		if err := rows.Scan(&c.ID, &c.MarketID, &c.ParentID, &c.UserID, &c.Body, &c.ReactionCount, &c.ReportCount, &created); err != nil {
			return nil, err
		}
		c.CreatedAt = created.UTC().Format(time.RFC3339)
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

func (s *sqlMarketSocialStore) CreateComment(ctx context.Context, marketID, parentID, userID, body string) (marketComment, error) {
	if err := s.ensureSchema(ctx); err != nil {
		return marketComment{}, err
	}
	var c marketComment
	var created time.Time
	var parent sql.NullString
	if parentID != "" {
		parent = sql.NullString{String: parentID, Valid: true}
	}
	err := s.db.QueryRowContext(ctx, `
INSERT INTO prediction_market_comments (market_id, parent_id, user_id, body)
VALUES ($1, $2, $3, $4)
RETURNING id, market_id, COALESCE(parent_id, ''), user_id, body, created_at`,
		marketID, parent, userID, body,
	).Scan(&c.ID, &c.MarketID, &c.ParentID, &c.UserID, &c.Body, &created)
	if err != nil {
		return marketComment{}, err
	}
	c.CreatedAt = created.UTC().Format(time.RFC3339)
	return c, nil
}

func (s *sqlMarketSocialStore) React(ctx context.Context, commentID, userID string) (marketComment, error) {
	if err := s.ensureSchema(ctx); err != nil {
		return marketComment{}, err
	}
	if _, err := s.db.ExecContext(ctx, `
INSERT INTO prediction_market_comment_reactions (comment_id, user_id)
VALUES ($1, $2)
ON CONFLICT (comment_id, user_id) DO NOTHING`, commentID, userID); err != nil {
		return marketComment{}, err
	}
	return s.getComment(ctx, commentID)
}

func (s *sqlMarketSocialStore) Report(ctx context.Context, commentID, userID, reason string) (marketComment, error) {
	if err := s.ensureSchema(ctx); err != nil {
		return marketComment{}, err
	}
	if _, err := s.db.ExecContext(ctx, `
INSERT INTO prediction_market_comment_reports (comment_id, user_id, reason)
VALUES ($1, $2, $3)
ON CONFLICT (comment_id, user_id) DO UPDATE
SET reason = EXCLUDED.reason, status = 'open', reviewed_at = NULL, reviewed_by = NULL, review_note = NULL, created_at = now()`, commentID, userID, reason); err != nil {
		return marketComment{}, err
	}
	return s.getComment(ctx, commentID)
}

func (s *sqlMarketSocialStore) ListReports(ctx context.Context, status string, limit int) ([]socialReport, error) {
	if err := s.ensureSchema(ctx); err != nil {
		return nil, err
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT p.comment_id, c.market_id, c.user_id, c.body, p.user_id, p.reason, p.status,
       p.created_at, p.reviewed_at, COALESCE(p.reviewed_by, ''), COALESCE(p.review_note, '')
FROM prediction_market_comment_reports p
JOIN prediction_market_comments c ON c.id = p.comment_id
WHERE ($1 = 'all' OR p.status = $1)
ORDER BY p.created_at DESC
LIMIT $2`, status, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	reports := []socialReport{}
	for rows.Next() {
		var report socialReport
		var created time.Time
		var reviewed sql.NullTime
		if err := rows.Scan(
			&report.CommentID,
			&report.MarketID,
			&report.CommentUserID,
			&report.Body,
			&report.ReporterUserID,
			&report.Reason,
			&report.Status,
			&created,
			&reviewed,
			&report.ReviewedBy,
			&report.ReviewNote,
		); err != nil {
			return nil, err
		}
		report.ID = socialReportID(report.CommentID, report.ReporterUserID)
		report.CreatedAt = created.UTC().Format(time.RFC3339)
		if reviewed.Valid {
			report.ReviewedAt = reviewed.Time.UTC().Format(time.RFC3339)
		}
		reports = append(reports, report)
	}
	return reports, rows.Err()
}

func (s *sqlMarketSocialStore) ResolveReport(ctx context.Context, reportID, adminID, status, note string) error {
	commentID, reporterUserID, err := parseSocialReportID(reportID)
	if err != nil {
		return err
	}
	if err := s.ensureSchema(ctx); err != nil {
		return err
	}
	res, err := s.db.ExecContext(ctx, `
UPDATE prediction_market_comment_reports
SET status = $3, reviewed_at = now(), reviewed_by = $4, review_note = $5
WHERE comment_id = $1 AND user_id = $2`, commentID, reporterUserID, status, adminID, note)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *sqlMarketSocialStore) getComment(ctx context.Context, commentID string) (marketComment, error) {
	var c marketComment
	var created time.Time
	err := s.db.QueryRowContext(ctx, `
SELECT c.id, c.market_id, COALESCE(c.parent_id, ''), c.user_id, c.body,
       COUNT(DISTINCT r.user_id), COUNT(DISTINCT p.user_id), c.created_at
FROM prediction_market_comments c
LEFT JOIN prediction_market_comment_reactions r ON r.comment_id = c.id
LEFT JOIN prediction_market_comment_reports p ON p.comment_id = c.id AND p.status = 'open'
WHERE c.id = $1
GROUP BY c.id, c.market_id, c.parent_id, c.user_id, c.body, c.created_at`, commentID).
		Scan(&c.ID, &c.MarketID, &c.ParentID, &c.UserID, &c.Body, &c.ReactionCount, &c.ReportCount, &created)
	if err != nil {
		return marketComment{}, err
	}
	c.CreatedAt = created.UTC().Format(time.RFC3339)
	return c, nil
}

func (s *sqlMarketSocialStore) PublicProfile(ctx context.Context, userID, viewerID string) (publicUserProfile, error) {
	if err := s.ensureSchema(ctx); err != nil {
		return publicUserProfile{}, err
	}
	var profile publicUserProfile
	var lastActive sql.NullTime
	var viewerFollowing bool
	err := s.db.QueryRowContext(ctx, `
SELECT
  $1::text AS user_id,
  COUNT(DISTINCT c.id) AS comment_count,
  COUNT(DISTINCT followers.follower_user_id) AS follower_count,
  COUNT(DISTINCT following.target_user_id) AS following_count,
  MAX(c.created_at) AS last_active_at,
  EXISTS (
    SELECT 1 FROM prediction_user_follows vf
    WHERE vf.target_user_id = $1 AND vf.follower_user_id = $2
  ) AS viewer_following
FROM (SELECT $1::text AS user_id) u
LEFT JOIN prediction_market_comments c ON c.user_id = u.user_id
LEFT JOIN prediction_user_follows followers ON followers.target_user_id = u.user_id
LEFT JOIN prediction_user_follows following ON following.follower_user_id = u.user_id`,
		userID, viewerID,
	).Scan(&profile.UserID, &profile.CommentCount, &profile.FollowerCount, &profile.FollowingCount, &lastActive, &viewerFollowing)
	if err != nil {
		return publicUserProfile{}, err
	}
	profile.DisplayName = profile.UserID
	profile.ViewerFollowing = viewerFollowing
	if lastActive.Valid {
		profile.LastActiveAt = lastActive.Time.UTC().Format(time.RFC3339)
	}
	return profile, nil
}

func (s *sqlMarketSocialStore) Follow(ctx context.Context, targetUserID, followerUserID string) (publicUserProfile, error) {
	if targetUserID == followerUserID {
		return publicUserProfile{}, errCannotFollowSelf
	}
	if err := s.ensureSchema(ctx); err != nil {
		return publicUserProfile{}, err
	}
	if _, err := s.db.ExecContext(ctx, `
INSERT INTO prediction_user_follows (target_user_id, follower_user_id)
VALUES ($1, $2)
ON CONFLICT (target_user_id, follower_user_id) DO NOTHING`, targetUserID, followerUserID); err != nil {
		return publicUserProfile{}, err
	}
	return s.PublicProfile(ctx, targetUserID, followerUserID)
}

func (s *sqlMarketSocialStore) UserActivity(ctx context.Context, userID string, limit int) ([]socialActivityItem, error) {
	if err := s.ensureSchema(ctx); err != nil {
		return nil, err
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT id, type, user_id, target_id, market_id, comment_id, body, created_at
FROM (
  SELECT 'comment:' || id AS id, 'comment' AS type, user_id, '' AS target_id,
         market_id, id AS comment_id, body, created_at
  FROM prediction_market_comments
  WHERE user_id = $1
  UNION ALL
  SELECT 'follow:' || follower_user_id || ':' || target_user_id AS id, 'follow' AS type,
         follower_user_id AS user_id, target_user_id AS target_id, '' AS market_id,
         '' AS comment_id, '' AS body, created_at
  FROM prediction_user_follows
  WHERE follower_user_id = $1 OR target_user_id = $1
  UNION ALL
  SELECT 'trade:buy:' || id::text AS id, 'trade' AS type, buyer_id AS user_id,
         COALESCE(seller_id, '') AS target_id, market_id::text AS market_id,
         '' AS comment_id,
         'Bought ' || quantity::text || ' ' || upper(side) || ' at ' || price_points::text || '/100' AS body,
         traded_at AS created_at
  FROM prediction_trades
  WHERE buyer_id = $1
  UNION ALL
  SELECT 'trade:sell:' || id::text AS id, 'trade' AS type, seller_id AS user_id,
         buyer_id AS target_id, market_id::text AS market_id, '' AS comment_id,
         'Sold ' || quantity::text || ' ' || upper(side) || ' at ' || price_points::text || '/100' AS body,
         traded_at AS created_at
  FROM prediction_trades
  WHERE seller_id = $1
  UNION ALL
  SELECT 'settlement:payout:' || p.id::text AS id, 'settlement' AS type, p.user_id,
         COALESCE(s.settled_by, '') AS target_id, p.market_id::text AS market_id,
         '' AS comment_id,
         'Settled ' || upper(p.side) || ' position - result ' || upper(s.result) AS body,
         p.paid_at AS created_at
  FROM prediction_payouts p
  JOIN prediction_settlements s ON s.id = p.settlement_id
  WHERE p.user_id = $1
  UNION ALL
  SELECT 'reward:loyalty:' || id::text AS id, 'reward' AS type, user_id,
         '' AS target_id, COALESCE(market_id::text, '') AS market_id,
         '' AS comment_id,
         CASE
           WHEN delta_points >= 0 THEN 'Earned ' || delta_points::text || ' reward points'
           ELSE 'Reward adjustment ' || delta_points::text || ' points'
         END AS body,
         created_at
  FROM loyalty_ledger
  WHERE user_id = $1
  UNION ALL
  SELECT 'leaderboard:' || board_id || ':' || user_id || ':' || extract(epoch from window_start)::bigint::text AS id,
         'leaderboard' AS type, user_id, board_id AS target_id,
         '' AS market_id, '' AS comment_id,
         'Rank #' || rank::text || ' on ' || board_id || ' leaderboard' AS body,
         computed_at AS created_at
  FROM leaderboard_snapshots
  WHERE user_id = $1
) activity
ORDER BY created_at DESC
LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSocialActivity(rows)
}

func (s *sqlMarketSocialStore) GlobalActivity(ctx context.Context, limit int) ([]socialActivityItem, error) {
	if err := s.ensureSchema(ctx); err != nil {
		return nil, err
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT id, type, user_id, target_id, market_id, comment_id, body, created_at
FROM (
  SELECT 'comment:' || id AS id, 'comment' AS type, user_id, '' AS target_id,
         market_id, id AS comment_id, body, created_at
  FROM prediction_market_comments
  UNION ALL
  SELECT 'follow:' || follower_user_id || ':' || target_user_id AS id, 'follow' AS type,
         follower_user_id AS user_id, target_user_id AS target_id, '' AS market_id,
         '' AS comment_id, '' AS body, created_at
  FROM prediction_user_follows
  UNION ALL
  SELECT 'trade:buy:' || id::text AS id, 'trade' AS type, buyer_id AS user_id,
         COALESCE(seller_id, '') AS target_id, market_id::text AS market_id,
         '' AS comment_id,
         'Bought ' || quantity::text || ' ' || upper(side) || ' at ' || price_points::text || '/100' AS body,
         traded_at AS created_at
  FROM prediction_trades
  UNION ALL
  SELECT 'trade:sell:' || id::text AS id, 'trade' AS type, seller_id AS user_id,
         buyer_id AS target_id, market_id::text AS market_id, '' AS comment_id,
         'Sold ' || quantity::text || ' ' || upper(side) || ' at ' || price_points::text || '/100' AS body,
         traded_at AS created_at
  FROM prediction_trades
  WHERE seller_id IS NOT NULL AND seller_id <> ''
  UNION ALL
  SELECT 'settlement:market:' || id::text AS id, 'settlement' AS type,
         COALESCE(settled_by, 'system') AS user_id, '' AS target_id,
         market_id::text AS market_id, '' AS comment_id,
         'Market resolved ' || upper(result) AS body,
         settled_at AS created_at
  FROM prediction_settlements
  UNION ALL
  SELECT 'reward:loyalty:' || id::text AS id, 'reward' AS type, user_id,
         '' AS target_id, COALESCE(market_id::text, '') AS market_id,
         '' AS comment_id,
         CASE
           WHEN delta_points >= 0 THEN 'Earned ' || delta_points::text || ' reward points'
           ELSE 'Reward adjustment ' || delta_points::text || ' points'
         END AS body,
         created_at
  FROM loyalty_ledger
  UNION ALL
  SELECT 'leaderboard:' || board_id || ':' || user_id || ':' || extract(epoch from window_start)::bigint::text AS id,
         'leaderboard' AS type, user_id, board_id AS target_id,
         '' AS market_id, '' AS comment_id,
         'Rank #' || rank::text || ' on ' || board_id || ' leaderboard' AS body,
         computed_at AS created_at
  FROM leaderboard_snapshots
  WHERE rank <= 25
) activity
ORDER BY created_at DESC
LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSocialActivity(rows)
}

func scanSocialActivity(rows *sql.Rows) ([]socialActivityItem, error) {
	items := []socialActivityItem{}
	for rows.Next() {
		var item socialActivityItem
		var created time.Time
		if err := rows.Scan(&item.ID, &item.Type, &item.UserID, &item.TargetID, &item.MarketID, &item.CommentID, &item.Body, &created); err != nil {
			return nil, err
		}
		item.CreatedAt = created.UTC().Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *sqlMarketSocialStore) ensureSchema(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS prediction_market_comments (
  id TEXT PRIMARY KEY DEFAULT 'mc_' || md5(random()::text || clock_timestamp()::text),
  market_id TEXT NOT NULL,
  parent_id TEXT NULL REFERENCES prediction_market_comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prediction_market_comments_market_created
  ON prediction_market_comments (market_id, created_at DESC);
CREATE TABLE IF NOT EXISTS prediction_market_comment_reactions (
  comment_id TEXT NOT NULL REFERENCES prediction_market_comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
CREATE TABLE IF NOT EXISTS prediction_market_comment_reports (
  comment_id TEXT NOT NULL REFERENCES prediction_market_comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by TEXT NULL,
  review_note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
ALTER TABLE prediction_market_comment_reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE prediction_market_comment_reports
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL;
ALTER TABLE prediction_market_comment_reports
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT NULL;
ALTER TABLE prediction_market_comment_reports
  ADD COLUMN IF NOT EXISTS review_note TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_prediction_market_comment_reports_status_created
  ON prediction_market_comment_reports (status, created_at DESC);
CREATE TABLE IF NOT EXISTS prediction_user_follows (
  target_user_id TEXT NOT NULL,
  follower_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (target_user_id, follower_user_id)
);
CREATE INDEX IF NOT EXISTS idx_prediction_user_follows_follower
  ON prediction_user_follows (follower_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_user_follows_target
  ON prediction_user_follows (target_user_id, created_at DESC);`)
	return err
}

func registerMarketSocialAdminRoutes(mux *stdhttp.ServeMux, store marketSocialStore) {
	mux.Handle("/api/v1/admin/social/activity", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		limit, err := socialLimitFromRequest(r)
		if err != nil {
			return err
		}
		items, err := store.GlobalActivity(r.Context(), limit)
		if err != nil {
			return httpx.Internal("failed to list social activity", err)
		}
		items = publicSocialActivityPayloads(items)
		if strings.EqualFold(r.URL.Query().Get("format"), "csv") {
			return writeSocialActivityCSV(w, items)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": items, "total": len(items)})
	}))

	mux.Handle("/api/v1/admin/social/reports", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		status := strings.TrimSpace(r.URL.Query().Get("status"))
		if status == "" {
			status = "open"
		}
		if !validSocialReportStatus(status) && status != "all" {
			return httpx.BadRequest("invalid report status", map[string]any{"field": "status"})
		}
		limit, err := socialLimitFromRequest(r)
		if err != nil {
			return err
		}
		reports, err := store.ListReports(r.Context(), status, limit)
		if err != nil {
			return httpx.Internal("failed to list social reports", err)
		}
		reports = adminSocialReportPayloads(reports)
		if strings.EqualFold(r.URL.Query().Get("format"), "csv") {
			return writeSocialReportsCSV(w, status, reports)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": reports, "total": len(reports)})
	}))

	mux.Handle("/api/v1/admin/social/reports/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		reportID, ok := parseAdminSocialReportResolvePath(r.URL.Path)
		if !ok {
			return httpx.NotFound("social report resource not found")
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		var req socialReportResolveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}
		status := strings.TrimSpace(req.Status)
		if status == "" {
			status = "reviewed"
		}
		if !validSocialReportResolutionStatus(status) {
			return httpx.BadRequest("invalid report status", map[string]any{"field": "status"})
		}
		note := strings.TrimSpace(req.Note)
		if len(note) > 500 {
			return httpx.BadRequest("review note must be at most 500 characters", map[string]any{"field": "note"})
		}
		if err := validateLaunchFacingReason("note", note); err != nil {
			return err
		}
		err := store.ResolveReport(r.Context(), reportID, adminActorFromRequest(r), status, note)
		if errors.Is(err, sql.ErrNoRows) {
			return httpx.NotFound("social report not found")
		}
		if err != nil {
			return httpx.Internal("failed to resolve social report", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"ok": true})
	}))
}

func writeSocialActivityCSV(w stdhttp.ResponseWriter, items []socialActivityItem) error {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="prediction-social-activity.csv"`)

	writer := csv.NewWriter(w)
	if err := writer.Write([]string{
		"activity_id",
		"type",
		"user_id",
		"target_id",
		"market_id",
		"comment_id",
		"body",
		"created_at",
	}); err != nil {
		return httpx.Internal("failed to write social activity csv", err)
	}
	for _, item := range items {
		if err := writer.Write([]string{
			csvSafeCell(item.ID),
			csvSafeCell(item.Type),
			csvSafeCell(item.UserID),
			csvSafeCell(item.TargetID),
			csvSafeCell(item.MarketID),
			csvSafeCell(item.CommentID),
			csvSafeCell(item.Body),
			csvSafeCell(item.CreatedAt),
		}); err != nil {
			return httpx.Internal("failed to write social activity csv", err)
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return httpx.Internal("failed to flush social activity csv", err)
	}
	return nil
}

func writeSocialReportsCSV(w stdhttp.ResponseWriter, status string, reports []socialReport) error {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="social-reports-`+csvSafeFilename(status)+`.csv"`)

	writer := csv.NewWriter(w)
	if err := writer.Write([]string{
		"report_id",
		"comment_id",
		"market_id",
		"comment_user_id",
		"reporter_user_id",
		"reason",
		"status",
		"created_at",
		"reviewed_at",
		"reviewed_by",
		"review_note",
		"comment_body",
	}); err != nil {
		return httpx.Internal("failed to write social reports csv", err)
	}
	for _, report := range reports {
		if err := writer.Write([]string{
			csvSafeCell(report.ID),
			csvSafeCell(report.CommentID),
			csvSafeCell(report.MarketID),
			csvSafeCell(report.CommentUserID),
			csvSafeCell(report.ReporterUserID),
			csvSafeCell(report.Reason),
			csvSafeCell(report.Status),
			csvSafeCell(report.CreatedAt),
			csvSafeCell(report.ReviewedAt),
			csvSafeCell(report.ReviewedBy),
			csvSafeCell(report.ReviewNote),
			csvSafeCell(report.Body),
		}); err != nil {
			return httpx.Internal("failed to write social reports csv", err)
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return httpx.Internal("failed to flush social reports csv", err)
	}
	return nil
}

func registerMarketSocialRoutes(mux *stdhttp.ServeMux, store marketSocialStore, writeLimiter socialWriteLimiter, ipWriteLimiter socialWriteLimiter) {
	mux.Handle("/api/v1/social/activity", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		limit, err := socialLimitFromRequest(r)
		if err != nil {
			return err
		}
		items, err := store.GlobalActivity(r.Context(), limit)
		if err != nil {
			return httpx.Internal("failed to list activity", err)
		}
		items = publicSocialActivityPayloads(items)
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": items, "total": len(items)})
	}))

	mux.Handle("/api/v1/social/users/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		userID, action, ok := parseSocialUserPath(r.URL.Path)
		if !ok {
			return httpx.NotFound("social user resource not found")
		}
		viewerID := httpx.UserIDFromContext(r.Context())
		switch action {
		case "profile":
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			profile, err := store.PublicProfile(r.Context(), userID, viewerID)
			if err != nil {
				return httpx.Internal("failed to load profile", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"profile": publicUserProfilePayload(profile)})
		case "follow":
			if r.Method != stdhttp.MethodPost {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
			}
			if viewerID == "" {
				return httpx.Forbidden("authentication required")
			}
			if err := checkSocialWriteLimit(r, writeLimiter, ipWriteLimiter, viewerID, "follow"); err != nil {
				return err
			}
			profile, err := store.Follow(r.Context(), userID, viewerID)
			if errors.Is(err, errCannotFollowSelf) {
				return httpx.BadRequest("cannot follow yourself", map[string]any{"field": "userId"})
			}
			if err != nil {
				return httpx.Internal("failed to follow user", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"profile": publicUserProfilePayload(profile)})
		case "activity":
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			limit, err := socialLimitFromRequest(r)
			if err != nil {
				return err
			}
			items, err := store.UserActivity(r.Context(), userID, limit)
			if err != nil {
				return httpx.Internal("failed to list user activity", err)
			}
			items = publicSocialActivityPayloads(items)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": items, "total": len(items)})
		default:
			return httpx.NotFound("social user action not found")
		}
	}))

	mux.Handle("/api/v1/social/markets/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		marketID, ok := parseMarketCommentsPath(r.URL.Path)
		if !ok {
			return httpx.NotFound("social market resource not found")
		}
		switch r.Method {
		case stdhttp.MethodGet:
			limit, err := socialLimitFromRequest(r)
			if err != nil {
				return err
			}
			comments, err := store.ListComments(r.Context(), marketID, limit)
			if err != nil {
				return httpx.Internal("failed to list comments", err)
			}
			comments = publicMarketCommentPayloads(comments)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": comments, "total": len(comments)})
		case stdhttp.MethodPost:
			userID := httpx.UserIDFromContext(r.Context())
			if userID == "" {
				return httpx.Forbidden("authentication required")
			}
			var req marketCommentCreateRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			body := strings.TrimSpace(req.Body)
			if len(body) < 2 || len(body) > 500 {
				return httpx.BadRequest("comment must be 2-500 characters", map[string]any{"field": "body"})
			}
			if err := validateLaunchFacingReason("body", body); err != nil {
				return err
			}
			if err := checkSocialWriteLimit(r, writeLimiter, ipWriteLimiter, userID, "comment"); err != nil {
				return err
			}
			comment, err := store.CreateComment(r.Context(), marketID, strings.TrimSpace(req.ParentID), userID, body)
			if err != nil {
				return httpx.Internal("failed to create comment", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{"comment": publicMarketCommentPayload(comment)})
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	mux.Handle("/api/v1/social/comments/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		commentID, action, ok := parseCommentActionPath(r.URL.Path)
		if !ok {
			return httpx.NotFound("social comment resource not found")
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Forbidden("authentication required")
		}
		var comment marketComment
		var err error
		switch action {
		case "react":
			if err := checkSocialWriteLimit(r, writeLimiter, ipWriteLimiter, userID, "react"); err != nil {
				return err
			}
			comment, err = store.React(r.Context(), commentID, userID)
		case "report":
			var req marketCommentReportRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			reason := strings.TrimSpace(req.Reason)
			if reason == "" {
				reason = "reported"
			}
			if err := validateLaunchFacingReason("reason", reason); err != nil {
				return err
			}
			if err := checkSocialWriteLimit(r, writeLimiter, ipWriteLimiter, userID, "report"); err != nil {
				return err
			}
			comment, err = store.Report(r.Context(), commentID, userID, reason)
		default:
			return httpx.NotFound("social comment action not found")
		}
		if errors.Is(err, sql.ErrNoRows) {
			return httpx.NotFound("comment not found")
		}
		if err != nil {
			return httpx.Internal("failed to update comment", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"comment": publicMarketCommentPayload(comment)})
	}))
}

func checkSocialWriteLimit(r *stdhttp.Request, userLimiter socialWriteLimiter, ipLimiter socialWriteLimiter, userID, action string) error {
	if userLimiter != nil && userID != "" {
		allowed, err := userLimiter.AllowWrite(r.Context(), action+":"+userID)
		if err != nil {
			return httpx.Internal("failed to check social write limit", err)
		}
		if !allowed {
			return httpx.TooManyRequests("too many social write actions; please wait a moment and try again")
		}
	}
	if ipLimiter == nil {
		return nil
	}
	ip := rewardIPSignal(r)
	if ip == "" {
		return nil
	}
	allowed, err := ipLimiter.AllowWrite(r.Context(), action+":"+ip)
	if err != nil {
		return httpx.Internal("failed to check social write limit", err)
	}
	if allowed {
		return nil
	}
	return httpx.TooManyRequests("too many social write actions; please wait a moment and try again")
}

func socialLimitFromRequest(r *stdhttp.Request) (int, error) {
	limit := 50
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			return 0, httpx.BadRequest("limit must be a positive integer", map[string]any{"field": "limit", "value": raw})
		}
		if parsed > 200 {
			parsed = 200
		}
		limit = parsed
	}
	return limit, nil
}

func parseMarketCommentsPath(path string) (string, bool) {
	const prefix = "/api/v1/social/markets/"
	rest := strings.TrimPrefix(path, prefix)
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] != "comments" {
		return "", false
	}
	return parts[0], true
}

func parseSocialUserPath(path string) (userID string, action string, ok bool) {
	const prefix = "/api/v1/social/users/"
	rest := strings.TrimPrefix(path, prefix)
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func parseCommentActionPath(path string) (commentID string, action string, ok bool) {
	const prefix = "/api/v1/social/comments/"
	rest := strings.TrimPrefix(path, prefix)
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func parseAdminSocialReportResolvePath(path string) (string, bool) {
	const prefix = "/api/v1/admin/social/reports/"
	rest := strings.TrimPrefix(path, prefix)
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] != "resolve" {
		return "", false
	}
	return parts[0], true
}

func socialReportID(commentID, reporterUserID string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(commentID + "\x00" + reporterUserID))
}

func parseSocialReportID(id string) (string, string, error) {
	raw, err := base64.RawURLEncoding.DecodeString(id)
	if err != nil {
		return "", "", sql.ErrNoRows
	}
	parts := strings.SplitN(string(raw), "\x00", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", sql.ErrNoRows
	}
	return parts[0], parts[1], nil
}

func validSocialReportStatus(status string) bool {
	switch status {
	case "open", "reviewed", "dismissed":
		return true
	default:
		return false
	}
}

func validSocialReportResolutionStatus(status string) bool {
	switch status {
	case "reviewed", "dismissed":
		return true
	default:
		return false
	}
}
