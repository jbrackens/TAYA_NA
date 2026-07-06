package livemarkets

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

func runPolymarketSports(ctx context.Context, store *Store, url string) {
	backoff := time.Second
	for ctx.Err() == nil {
		store.SetProvider(ProviderStatus{
			Key:   polymarketSportsKey,
			Label: "Sports live moments",
			State: "connecting",
		})

		conn, _, err := websocket.DefaultDialer.DialContext(ctx, url, nil)
		if err != nil {
			store.SetProvider(ProviderStatus{
				Key:   polymarketSportsKey,
				Label: "Sports live moments",
				State: "error",
				Error: "live sports socket connection failed",
			})
			slog.Warn("live markets: sports socket connect failed", "err", err)
			sleep(ctx, backoff)
			backoff = nextBackoff(backoff)
			continue
		}

		connectedAt := time.Now().UTC()
		store.SetProvider(ProviderStatus{
			Key:             polymarketSportsKey,
			Label:           "Sports live moments",
			State:           "connected",
			LastConnectedAt: &connectedAt,
		})
		backoff = time.Second

		done := make(chan struct{})
		go func() {
			select {
			case <-ctx.Done():
				_ = conn.Close()
			case <-done:
			}
		}()

		for ctx.Err() == nil {
			_, data, err := conn.ReadMessage()
			if err != nil {
				close(done)
				_ = conn.Close()
				store.SetProvider(ProviderStatus{
					Key:             polymarketSportsKey,
					Label:           "Sports live moments",
					State:           "stale",
					LastConnectedAt: &connectedAt,
					Error:           "live sports socket disconnected",
				})
				slog.Warn("live markets: sports socket read failed", "err", err)
				break
			}
			message := strings.TrimSpace(string(data))
			if strings.EqualFold(message, "ping") {
				_ = conn.WriteMessage(websocket.TextMessage, []byte("pong"))
				continue
			}
			events := parseSportsEvents(data, time.Now().UTC())
			if len(events) == 0 {
				continue
			}
			lastMessageAt := time.Now().UTC()
			store.SetProvider(ProviderStatus{
				Key:             polymarketSportsKey,
				Label:           "Sports live moments",
				State:           "connected",
				LastConnectedAt: &connectedAt,
				LastMessageAt:   &lastMessageAt,
			})
			for _, event := range events {
				store.UpsertEvent(event)
			}
		}
		sleep(ctx, backoff)
		backoff = nextBackoff(backoff)
	}
}

func parseSportsEvents(data []byte, fallbackTime time.Time) []Event {
	var raw any
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil
	}
	return collectSportsEvents(raw, fallbackTime)
}

func collectSportsEvents(raw any, fallbackTime time.Time) []Event {
	switch value := raw.(type) {
	case []any:
		out := []Event{}
		for _, item := range value {
			out = append(out, collectSportsEvents(item, fallbackTime)...)
		}
		return out
	case map[string]any:
		if event, ok := normalizeSportsEvent(value, fallbackTime); ok {
			return []Event{event}
		}
		for _, key := range []string{"event", "data", "payload", "result", "game"} {
			if nested, ok := value[key]; ok {
				if events := collectSportsEvents(nested, fallbackTime); len(events) > 0 {
					return events
				}
			}
		}
	}
	return nil
}

func normalizeSportsEvent(raw map[string]any, fallbackTime time.Time) (Event, bool) {
	home := firstText(raw, "home_team", "homeTeam", "home", "home_name", "homeName")
	away := firstText(raw, "away_team", "awayTeam", "away", "away_name", "awayName")
	id := firstText(raw, "id", "game_id", "gameId", "event_id", "eventId", "slug")
	if id == "" && home != "" && away != "" {
		id = strings.ToLower(strings.Join([]string{home, away}, "-"))
	}
	if id == "" || (home == "" && away == "") {
		return Event{}, false
	}

	status := firstText(raw, "status", "game_status", "gameStatus", "state")
	score := firstText(raw, "score", "display_score", "displayScore")
	homeScore, awayScore := firstNumberText(raw, "home_score", "homeScore", "home_points", "homePoints"), firstNumberText(raw, "away_score", "awayScore", "away_points", "awayPoints")
	if score == "" && homeScore != "" && awayScore != "" {
		score = homeScore + "-" + awayScore
	}

	updatedAt := firstTime(raw, fallbackTime, "updated_at", "updatedAt", "timestamp", "ts", "last_update", "lastUpdate")
	live := truthy(raw, "live", "is_live", "isLive", "in_play", "inPlay")
	ended := truthy(raw, "ended", "is_final", "isFinal", "finished")
	if !live {
		lowStatus := strings.ToLower(status)
		live = strings.Contains(lowStatus, "live") || strings.Contains(lowStatus, "progress") || strings.Contains(lowStatus, "period")
	}
	if !ended {
		lowStatus := strings.ToLower(status)
		ended = strings.Contains(lowStatus, "final") || strings.Contains(lowStatus, "complete") || strings.Contains(lowStatus, "ended")
	}

	return Event{
		ID:        id,
		Source:    "sports-live",
		Sport:     firstText(raw, "sport", "sport_name", "sportName"),
		League:    firstText(raw, "league", "competition", "tournament"),
		HomeTeam:  home,
		AwayTeam:  away,
		Status:    status,
		Score:     score,
		Period:    firstText(raw, "period", "quarter", "inning", "half"),
		Clock:     firstText(raw, "clock", "time", "game_clock", "gameClock"),
		Live:      live && !ended,
		Ended:     ended,
		UpdatedAt: updatedAt,
	}, true
}

func firstText(raw map[string]any, keys ...string) string {
	for _, key := range keys {
		switch value := raw[key].(type) {
		case string:
			if trimmed := strings.TrimSpace(value); trimmed != "" {
				return trimmed
			}
		case float64:
			if !math.IsNaN(value) {
				return fmt.Sprintf("%.0f", value)
			}
		case int:
			return fmt.Sprintf("%d", value)
		case bool:
			return fmt.Sprintf("%t", value)
		}
	}
	return ""
}

func firstNumberText(raw map[string]any, keys ...string) string {
	for _, key := range keys {
		switch value := raw[key].(type) {
		case float64:
			if !math.IsNaN(value) {
				return fmt.Sprintf("%.0f", value)
			}
		case int:
			return fmt.Sprintf("%d", value)
		case string:
			if trimmed := strings.TrimSpace(value); trimmed != "" {
				return trimmed
			}
		}
	}
	return ""
}

func firstTime(raw map[string]any, fallback time.Time, keys ...string) time.Time {
	for _, key := range keys {
		switch value := raw[key].(type) {
		case string:
			if parsed, err := time.Parse(time.RFC3339Nano, value); err == nil {
				return parsed.UTC()
			}
			if parsed, err := time.Parse(time.RFC3339, value); err == nil {
				return parsed.UTC()
			}
		case float64:
			if value > 1_000_000_000_000 {
				return time.UnixMilli(int64(value)).UTC()
			}
			if value > 1_000_000_000 {
				return time.Unix(int64(value), 0).UTC()
			}
		}
	}
	return fallback
}

func truthy(raw map[string]any, keys ...string) bool {
	for _, key := range keys {
		switch value := raw[key].(type) {
		case bool:
			return value
		case string:
			low := strings.ToLower(strings.TrimSpace(value))
			if low == "true" || low == "1" || low == "yes" || low == "live" {
				return true
			}
		}
	}
	return false
}

func nextBackoff(current time.Duration) time.Duration {
	next := current * 2
	if next > 30*time.Second {
		return 30 * time.Second
	}
	return next
}

func sleep(ctx context.Context, d time.Duration) {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
	case <-timer.C:
	}
}
