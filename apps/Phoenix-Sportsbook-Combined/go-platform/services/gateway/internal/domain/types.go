package domain

type Fixture struct {
	ID         string `json:"id"`
	SportKey   string `json:"sportKey,omitempty"`
	LeagueKey  string `json:"leagueKey,omitempty"`
	SeasonKey  string `json:"seasonKey,omitempty"`
	EventKey   string `json:"eventKey,omitempty"`
	Status     string `json:"status,omitempty"`
	Tournament string `json:"tournament"`
	HomeTeam   string `json:"homeTeam"`
	AwayTeam   string `json:"awayTeam"`
	StartsAt   string `json:"startsAt"`
}

type MarketSelection struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Odds   float64 `json:"odds"`
	Active bool    `json:"active"`
}

type Market struct {
	ID            string            `json:"id"`
	FixtureID     string            `json:"fixtureId"`
	SportKey      string            `json:"sportKey,omitempty"`
	LeagueKey     string            `json:"leagueKey,omitempty"`
	EventKey      string            `json:"eventKey,omitempty"`
	Name          string            `json:"name"`
	Status        string            `json:"status"`
	StartsAt      string            `json:"startsAt"`
	Selections    []MarketSelection `json:"selections,omitempty"`
	MinStakeCents int64             `json:"minStakeCents,omitempty"`
	MaxStakeCents int64             `json:"maxStakeCents,omitempty"`
}

type Punter struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	Status      string `json:"status"`
	CountryCode string `json:"countryCode"`
	CreatedAt   string `json:"createdAt"`
	LastLoginAt string `json:"lastLoginAt"`
}

type FixtureFilter struct {
	Tournament string
}

type MarketFilter struct {
	FixtureID string
	Status    string
}

type PunterFilter struct {
	Status string
	Search string
}

type PageRequest struct {
	Page     int
	PageSize int
	SortBy   string
	SortDir  string
}

type PageMeta struct {
	Page     int  `json:"page"`
	PageSize int  `json:"pageSize"`
	Total    int  `json:"total"`
	HasNext  bool `json:"hasNext"`
}
