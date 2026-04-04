package domain

import "fmt"

type ReadRepository interface {
	ListFixtures(filter FixtureFilter, page PageRequest) ([]Fixture, PageMeta, error)
	GetFixtureByID(id string) (Fixture, error)
	ListMarkets(filter MarketFilter, page PageRequest) ([]Market, PageMeta, error)
	GetMarketByID(id string) (Market, error)
	ListPunters(filter PunterFilter, page PageRequest) ([]Punter, PageMeta, error)
	GetPunterByID(id string) (Punter, error)
}

var ErrNotFound = fmt.Errorf("entity not found")
