package domain

import (
	"encoding/json"
	"fmt"
	"os"
)

type readModelSnapshot struct {
	Fixtures []Fixture `json:"fixtures"`
	Markets  []Market  `json:"markets"`
	Punters  []Punter  `json:"punters"`
}

type FileReadRepository struct {
	sourcePath string
	inner      *InMemoryReadRepository
}

func NewFileReadRepository(path string) (*FileReadRepository, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read gateway read-model file: %w", err)
	}

	var snapshot readModelSnapshot
	if err := json.Unmarshal(raw, &snapshot); err != nil {
		return nil, fmt.Errorf("decode gateway read-model file: %w", err)
	}

	repository := &InMemoryReadRepository{
		fixtures: snapshot.Fixtures,
		markets:  snapshot.Markets,
		punters:  snapshot.Punters,
	}

	return &FileReadRepository{
		sourcePath: path,
		inner:      repository,
	}, nil
}

func (r *FileReadRepository) ListFixtures(filter FixtureFilter, page PageRequest) ([]Fixture, PageMeta, error) {
	return r.inner.ListFixtures(filter, page)
}

func (r *FileReadRepository) GetFixtureByID(id string) (Fixture, error) {
	return r.inner.GetFixtureByID(id)
}

func (r *FileReadRepository) ListMarkets(filter MarketFilter, page PageRequest) ([]Market, PageMeta, error) {
	return r.inner.ListMarkets(filter, page)
}

func (r *FileReadRepository) GetMarketByID(id string) (Market, error) {
	return r.inner.GetMarketByID(id)
}

func (r *FileReadRepository) ListPunters(filter PunterFilter, page PageRequest) ([]Punter, PageMeta, error) {
	return r.inner.ListPunters(filter, page)
}

func (r *FileReadRepository) GetPunterByID(id string) (Punter, error) {
	return r.inner.GetPunterByID(id)
}
