package livemarkets

import "time"

type Event struct {
	ID        string    `json:"id"`
	Source    string    `json:"source,omitempty"`
	Title     string    `json:"title,omitempty"`
	Sport     string    `json:"sport,omitempty"`
	League    string    `json:"league,omitempty"`
	HomeTeam  string    `json:"homeTeam,omitempty"`
	AwayTeam  string    `json:"awayTeam,omitempty"`
	Status    string    `json:"status,omitempty"`
	Score     string    `json:"score,omitempty"`
	Detail    string    `json:"detail,omitempty"`
	Period    string    `json:"period,omitempty"`
	Clock     string    `json:"clock,omitempty"`
	Live      bool      `json:"live"`
	Ended     bool      `json:"ended"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ProviderStatus struct {
	Key             string     `json:"key"`
	Label           string     `json:"label"`
	State           string     `json:"state"`
	LastConnectedAt *time.Time `json:"lastConnectedAt,omitempty"`
	LastMessageAt   *time.Time `json:"lastMessageAt,omitempty"`
	Error           string     `json:"error,omitempty"`
}

type Snapshot struct {
	Events    []Event          `json:"events"`
	Providers []ProviderStatus `json:"providers"`
	Generated time.Time        `json:"generatedAt"`
}
