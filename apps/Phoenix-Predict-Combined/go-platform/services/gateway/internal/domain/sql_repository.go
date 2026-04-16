package domain

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const readRepositoryQueryTimeout = 5 * time.Second

type SQLReadRepository struct {
	db *sql.DB
}

func NewSQLReadRepository(db *sql.DB) *SQLReadRepository {
	return &SQLReadRepository{db: db}
}

func OpenSQLReadRepository(driver string, dsn string) (*SQLReadRepository, error) {
	if strings.TrimSpace(driver) == "" {
		driver = "postgres"
	}
	if strings.TrimSpace(dsn) == "" {
		return nil, fmt.Errorf("empty dsn")
	}

	db, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), readRepositoryQueryTimeout)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}

	return &SQLReadRepository{db: db}, nil
}

func (r *SQLReadRepository) ListFixtures(filter FixtureFilter, page PageRequest) ([]Fixture, PageMeta, error) {
	normalized := normalizePageRequest(page)

	where := make([]string, 0, 1)
	args := make([]any, 0, 4)
	if filter.Tournament != "" {
		where = append(where, fmt.Sprintf("LOWER(tournament) LIKE $%d", len(args)+1))
		args = append(args, "%"+strings.ToLower(strings.TrimSpace(filter.Tournament))+"%")
	}

	countQuery := "SELECT COUNT(1) FROM fixtures"
	if len(where) > 0 {
		countQuery += " WHERE " + strings.Join(where, " AND ")
	}

	ctx, cancel := context.WithTimeout(context.Background(), readRepositoryQueryTimeout)
	defer cancel()

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, PageMeta{}, err
	}

	sortColumn := fixtureSortColumn(normalized.SortBy)
	sortDirection := sortDirection(normalized.SortDir)
	limitArg := len(args) + 1
	offsetArg := len(args) + 2

	query := fmt.Sprintf(`
SELECT id, tournament, home_team, away_team, CAST(starts_at AS TEXT)
FROM fixtures
%s
ORDER BY %s %s, id %s
LIMIT $%d OFFSET $%d`,
		whereClause(where),
		sortColumn,
		sortDirection,
		sortDirection,
		limitArg,
		offsetArg,
	)

	pagedArgs := append(args, normalized.PageSize, (normalized.Page-1)*normalized.PageSize)
	rows, err := r.db.QueryContext(ctx, query, pagedArgs...)
	if err != nil {
		return nil, PageMeta{}, err
	}
	defer rows.Close()

	items := make([]Fixture, 0, normalized.PageSize)
	for rows.Next() {
		var item Fixture
		if err := rows.Scan(&item.ID, &item.Tournament, &item.HomeTeam, &item.AwayTeam, &item.StartsAt); err != nil {
			return nil, PageMeta{}, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, PageMeta{}, err
	}

	meta := PageMeta{
		Page:     normalized.Page,
		PageSize: normalized.PageSize,
		Total:    total,
		HasNext:  normalized.Page*normalized.PageSize < total,
	}
	return items, meta, nil
}

func (r *SQLReadRepository) GetFixtureByID(id string) (Fixture, error) {
	ctx, cancel := context.WithTimeout(context.Background(), readRepositoryQueryTimeout)
	defer cancel()

	var item Fixture
	err := r.db.QueryRowContext(ctx, `
SELECT id, tournament, home_team, away_team, CAST(starts_at AS TEXT)
FROM fixtures
WHERE id = $1
LIMIT 1`, id).Scan(&item.ID, &item.Tournament, &item.HomeTeam, &item.AwayTeam, &item.StartsAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Fixture{}, ErrNotFound
		}
		return Fixture{}, err
	}
	return item, nil
}

func (r *SQLReadRepository) ListMarkets(filter MarketFilter, page PageRequest) ([]Market, PageMeta, error) {
	normalized := normalizePageRequest(page)

	where := make([]string, 0, 2)
	args := make([]any, 0, 6)
	if filter.FixtureID != "" {
		where = append(where, fmt.Sprintf("fixture_id = $%d", len(args)+1))
		args = append(args, strings.TrimSpace(filter.FixtureID))
	}
	if filter.Status != "" {
		where = append(where, fmt.Sprintf("LOWER(status) = $%d", len(args)+1))
		args = append(args, strings.ToLower(strings.TrimSpace(filter.Status)))
	}

	countQuery := "SELECT COUNT(1) FROM markets"
	if len(where) > 0 {
		countQuery += " WHERE " + strings.Join(where, " AND ")
	}

	ctx, cancel := context.WithTimeout(context.Background(), readRepositoryQueryTimeout)
	defer cancel()

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, PageMeta{}, err
	}

	sortColumn := marketSortColumn(normalized.SortBy)
	sortDirection := sortDirection(normalized.SortDir)
	limitArg := len(args) + 1
	offsetArg := len(args) + 2

	query := fmt.Sprintf(`
SELECT id, fixture_id, name, status, CAST(starts_at AS TEXT)
FROM markets
%s
ORDER BY %s %s, id %s
LIMIT $%d OFFSET $%d`,
		whereClause(where),
		sortColumn,
		sortDirection,
		sortDirection,
		limitArg,
		offsetArg,
	)

	pagedArgs := append(args, normalized.PageSize, (normalized.Page-1)*normalized.PageSize)
	rows, err := r.db.QueryContext(ctx, query, pagedArgs...)
	if err != nil {
		return nil, PageMeta{}, err
	}
	defer rows.Close()

	items := make([]Market, 0, normalized.PageSize)
	for rows.Next() {
		var item Market
		if err := rows.Scan(&item.ID, &item.FixtureID, &item.Name, &item.Status, &item.StartsAt); err != nil {
			return nil, PageMeta{}, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, PageMeta{}, err
	}

	meta := PageMeta{
		Page:     normalized.Page,
		PageSize: normalized.PageSize,
		Total:    total,
		HasNext:  normalized.Page*normalized.PageSize < total,
	}
	return items, meta, nil
}

func (r *SQLReadRepository) GetMarketByID(id string) (Market, error) {
	ctx, cancel := context.WithTimeout(context.Background(), readRepositoryQueryTimeout)
	defer cancel()

	var item Market
	err := r.db.QueryRowContext(ctx, `
SELECT id, fixture_id, name, status, CAST(starts_at AS TEXT)
FROM markets
WHERE id = $1
LIMIT 1`, id).Scan(&item.ID, &item.FixtureID, &item.Name, &item.Status, &item.StartsAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Market{}, ErrNotFound
		}
		return Market{}, err
	}
	return item, nil
}

func (r *SQLReadRepository) ListPunters(filter PunterFilter, page PageRequest) ([]Punter, PageMeta, error) {
	normalized := normalizePageRequest(page)

	where := make([]string, 0, 2)
	args := make([]any, 0, 6)
	if filter.Status != "" {
		where = append(where, fmt.Sprintf("LOWER(status) = $%d", len(args)+1))
		args = append(args, strings.ToLower(strings.TrimSpace(filter.Status)))
	}
	if strings.TrimSpace(filter.Search) != "" {
		search := "%" + strings.ToLower(strings.TrimSpace(filter.Search)) + "%"
		where = append(where, fmt.Sprintf("(LOWER(email) LIKE $%d OR LOWER(id) LIKE $%d)", len(args)+1, len(args)+2))
		args = append(args, search, search)
	}

	countQuery := "SELECT COUNT(1) FROM punters"
	if len(where) > 0 {
		countQuery += " WHERE " + strings.Join(where, " AND ")
	}

	ctx, cancel := context.WithTimeout(context.Background(), readRepositoryQueryTimeout)
	defer cancel()

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, PageMeta{}, err
	}

	sortColumn := punterSortColumn(normalized.SortBy)
	sortDirection := sortDirection(normalized.SortDir)
	limitArg := len(args) + 1
	offsetArg := len(args) + 2

	query := fmt.Sprintf(`
SELECT id, email, status, country_code, CAST(created_at AS TEXT), CAST(last_login_at AS TEXT)
FROM punters
%s
ORDER BY %s %s, id %s
LIMIT $%d OFFSET $%d`,
		whereClause(where),
		sortColumn,
		sortDirection,
		sortDirection,
		limitArg,
		offsetArg,
	)

	pagedArgs := append(args, normalized.PageSize, (normalized.Page-1)*normalized.PageSize)
	rows, err := r.db.QueryContext(ctx, query, pagedArgs...)
	if err != nil {
		return nil, PageMeta{}, err
	}
	defer rows.Close()

	items := make([]Punter, 0, normalized.PageSize)
	for rows.Next() {
		var item Punter
		if err := rows.Scan(&item.ID, &item.Email, &item.Status, &item.CountryCode, &item.CreatedAt, &item.LastLoginAt); err != nil {
			return nil, PageMeta{}, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, PageMeta{}, err
	}

	meta := PageMeta{
		Page:     normalized.Page,
		PageSize: normalized.PageSize,
		Total:    total,
		HasNext:  normalized.Page*normalized.PageSize < total,
	}
	return items, meta, nil
}

func (r *SQLReadRepository) GetPunterByID(id string) (Punter, error) {
	ctx, cancel := context.WithTimeout(context.Background(), readRepositoryQueryTimeout)
	defer cancel()

	var item Punter
	err := r.db.QueryRowContext(ctx, `
SELECT id, email, status, country_code, CAST(created_at AS TEXT), CAST(last_login_at AS TEXT)
FROM punters
WHERE id = $1
LIMIT 1`, id).Scan(&item.ID, &item.Email, &item.Status, &item.CountryCode, &item.CreatedAt, &item.LastLoginAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Punter{}, ErrNotFound
		}
		return Punter{}, err
	}
	return item, nil
}

func (r *SQLReadRepository) UpdatePunterStatus(id string, status string) (Punter, error) {
	ctx, cancel := context.WithTimeout(context.Background(), readRepositoryQueryTimeout)
	defer cancel()

	var item Punter
	err := r.db.QueryRowContext(ctx, `
UPDATE punters
SET status = $2
WHERE id = $1
RETURNING id, email, status, country_code, CAST(created_at AS TEXT), CAST(last_login_at AS TEXT)
`, id, status).Scan(&item.ID, &item.Email, &item.Status, &item.CountryCode, &item.CreatedAt, &item.LastLoginAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Punter{}, ErrNotFound
		}
		return Punter{}, err
	}

	return item, nil
}

func whereClause(conditions []string) string {
	if len(conditions) == 0 {
		return ""
	}
	return "WHERE " + strings.Join(conditions, " AND ")
}

func sortDirection(direction string) string {
	if strings.EqualFold(direction, "desc") {
		return "DESC"
	}
	return "ASC"
}

func fixtureSortColumn(field string) string {
	switch field {
	case "tournament":
		return "tournament"
	case "homeTeam":
		return "home_team"
	case "awayTeam":
		return "away_team"
	case "startsAt":
		fallthrough
	default:
		return "starts_at"
	}
}

func marketSortColumn(field string) string {
	switch field {
	case "name":
		return "name"
	case "status":
		return "status"
	case "fixtureId":
		return "fixture_id"
	case "startsAt":
		fallthrough
	default:
		return "starts_at"
	}
}

func punterSortColumn(field string) string {
	switch field {
	case "email":
		return "email"
	case "status":
		return "status"
	case "lastLoginAt":
		return "last_login_at"
	case "createdAt":
		fallthrough
	default:
		return "created_at"
	}
}
