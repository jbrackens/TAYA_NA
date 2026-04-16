package matchtracker

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

type Service struct {
	mu        sync.RWMutex
	timelines map[string]canonicalv1.MatchTimeline
}

func NewService() *Service {
	return &Service{
		timelines: map[string]canonicalv1.MatchTimeline{},
	}
}

func (s *Service) GetTimeline(fixtureID string) (canonicalv1.MatchTimeline, bool) {
	id := normalizeFixtureID(fixtureID)
	if id == "" {
		return canonicalv1.MatchTimeline{}, false
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	timeline, ok := s.timelines[id]
	if !ok {
		return canonicalv1.MatchTimeline{}, false
	}
	return cloneTimeline(timeline), true
}

func (s *Service) UpsertTimeline(timeline canonicalv1.MatchTimeline) bool {
	now := time.Now().UTC()
	normalized, ok := normalizeTimeline(timeline, now)
	if !ok {
		return false
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.timelines[normalized.FixtureID] = normalized
	return true
}

func (s *Service) DeleteTimeline(fixtureID string) {
	id := normalizeFixtureID(fixtureID)
	if id == "" {
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.timelines, id)
}

func (s *Service) ApplyIncident(incident canonicalv1.MatchIncident, fallbackOccurredAt time.Time) bool {
	fixtureID := normalizeFixtureID(incident.FixtureID)
	if fixtureID == "" {
		return false
	}

	if fallbackOccurredAt.IsZero() {
		fallbackOccurredAt = time.Now().UTC()
	}
	normalizedIncident := normalizeIncident(incident, fixtureID, fallbackOccurredAt)

	s.mu.Lock()
	defer s.mu.Unlock()

	timeline := s.timelines[fixtureID]
	if strings.TrimSpace(timeline.FixtureID) == "" {
		timeline = canonicalv1.MatchTimeline{
			FixtureID: fixtureID,
			Status:    canonicalv1.FixtureStatusUnknown,
			UpdatedAt: normalizedIncident.OccurredAt,
		}
	}
	if timeline.Status == "" {
		timeline.Status = canonicalv1.FixtureStatusUnknown
	}
	if normalizedIncident.Period != "" {
		timeline.Period = normalizedIncident.Period
	}
	timeline.ClockSeconds = normalizedIncident.ClockSeconds
	timeline.Score = normalizedIncident.Score
	timeline.UpdatedAt = maxTime(timeline.UpdatedAt, normalizedIncident.OccurredAt)
	timeline.Incidents = appendOrReplaceIncident(timeline.Incidents, normalizedIncident)

	s.timelines[fixtureID] = cloneTimeline(timeline)
	return true
}

func normalizeTimeline(timeline canonicalv1.MatchTimeline, fallback time.Time) (canonicalv1.MatchTimeline, bool) {
	id := normalizeFixtureID(timeline.FixtureID)
	if id == "" {
		return canonicalv1.MatchTimeline{}, false
	}

	normalized := canonicalv1.MatchTimeline{
		FixtureID:    id,
		Status:       timeline.Status,
		Period:       strings.TrimSpace(timeline.Period),
		ClockSeconds: timeline.ClockSeconds,
		Score:        timeline.Score,
		UpdatedAt:    timeline.UpdatedAt,
	}
	if normalized.Status == "" {
		normalized.Status = canonicalv1.FixtureStatusUnknown
	}
	if normalized.UpdatedAt.IsZero() {
		normalized.UpdatedAt = fallback
	}

	normalized.Incidents = make([]canonicalv1.MatchIncident, 0, len(timeline.Incidents))
	for _, incident := range timeline.Incidents {
		normalized.Incidents = append(normalized.Incidents, normalizeIncident(incident, id, normalized.UpdatedAt))
	}
	normalized.Incidents = sortIncidents(normalized.Incidents)

	return normalized, true
}

func normalizeIncident(
	incident canonicalv1.MatchIncident,
	fixtureID string,
	fallbackOccurredAt time.Time,
) canonicalv1.MatchIncident {
	out := canonicalv1.MatchIncident{
		IncidentID:    strings.TrimSpace(incident.IncidentID),
		FixtureID:     fixtureID,
		Type:          incident.Type,
		Period:        strings.TrimSpace(incident.Period),
		ClockSeconds:  incident.ClockSeconds,
		ParticipantID: strings.TrimSpace(incident.ParticipantID),
		Score:         incident.Score,
		Details:       cloneDetails(incident.Details),
		OccurredAt:    incident.OccurredAt.UTC(),
	}
	if out.OccurredAt.IsZero() {
		out.OccurredAt = fallbackOccurredAt.UTC()
	}
	if out.IncidentID == "" {
		out.IncidentID = fmt.Sprintf(
			"inc:%s:%s:%d",
			fixtureID,
			strings.TrimSpace(string(out.Type)),
			out.OccurredAt.Unix(),
		)
	}
	return out
}

func appendOrReplaceIncident(
	incidents []canonicalv1.MatchIncident,
	incident canonicalv1.MatchIncident,
) []canonicalv1.MatchIncident {
	out := make([]canonicalv1.MatchIncident, len(incidents))
	copy(out, incidents)

	id := strings.TrimSpace(incident.IncidentID)
	if id != "" {
		for i := range out {
			if strings.EqualFold(strings.TrimSpace(out[i].IncidentID), id) {
				out[i] = incident
				return sortIncidents(out)
			}
		}
	}
	out = append(out, incident)
	return sortIncidents(out)
}

func sortIncidents(incidents []canonicalv1.MatchIncident) []canonicalv1.MatchIncident {
	out := make([]canonicalv1.MatchIncident, len(incidents))
	copy(out, incidents)
	sort.SliceStable(out, func(i, j int) bool {
		if !out[i].OccurredAt.Equal(out[j].OccurredAt) {
			return out[i].OccurredAt.Before(out[j].OccurredAt)
		}
		if out[i].ClockSeconds != out[j].ClockSeconds {
			return out[i].ClockSeconds < out[j].ClockSeconds
		}
		return strings.Compare(out[i].IncidentID, out[j].IncidentID) < 0
	})
	return out
}

func cloneTimeline(timeline canonicalv1.MatchTimeline) canonicalv1.MatchTimeline {
	out := timeline
	out.Incidents = make([]canonicalv1.MatchIncident, len(timeline.Incidents))
	copy(out.Incidents, timeline.Incidents)
	for i := range out.Incidents {
		out.Incidents[i].Details = cloneDetails(out.Incidents[i].Details)
	}
	return out
}

func cloneDetails(source map[string]string) map[string]string {
	if len(source) == 0 {
		return nil
	}
	out := make(map[string]string, len(source))
	for key, value := range source {
		out[key] = value
	}
	return out
}

func normalizeFixtureID(value string) string {
	return strings.TrimSpace(value)
}

func maxTime(a time.Time, b time.Time) time.Time {
	if a.IsZero() {
		return b
	}
	if b.IsZero() {
		return a
	}
	if b.After(a) {
		return b
	}
	return a
}
