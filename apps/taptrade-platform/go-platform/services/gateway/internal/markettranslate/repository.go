package markettranslate

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/lib/pq"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListCandidates(ctx context.Context, locales []string, limit int, tickers []string) ([]MarketCopy, error) {
	if limit <= 0 {
		limit = 50
	}
	locales = NormalizeLocales(locales)
	tickers = ParseTickerList(strings.Join(tickers, ","))
	rows, err := r.db.QueryContext(ctx, `
		WITH target_locale AS (
			SELECT unnest($1::text[]) AS locale
		)
		SELECT
		       m.id::text,
		       m.ticker,
		       m.title,
		       COALESCE(m.description, ''),
		       COALESCE(m.translations, '{}'::jsonb) AS translations,
		       CASE
		         WHEN EXISTS (
		           SELECT 1
		           FROM target_locale tl
		           WHERE NOT (COALESCE(m.translations, '{}'::jsonb) ? tl.locale)
		              OR COALESCE(m.translations->tl.locale->>'title', '') = ''
		              OR (COALESCE(m.description, '') <> ''
		                  AND COALESCE(m.translations->tl.locale->>'description', '') = '')
		         ) THEN 0
		         ELSE 1
		       END AS priority
		FROM prediction_markets m
		WHERE btrim(m.title) <> ''
		  AND (COALESCE(cardinality($3::text[]), 0) = 0 OR m.ticker = ANY($3::text[]))
		  AND (
		    EXISTS (
		      SELECT 1
		      FROM target_locale tl
		      WHERE NOT (COALESCE(m.translations, '{}'::jsonb) ? tl.locale)
		         OR COALESCE(m.translations->tl.locale->>'title', '') = ''
		         OR (COALESCE(m.description, '') <> ''
		             AND COALESCE(m.translations->tl.locale->>'description', '') = '')
		    )
		    OR EXISTS (
		      SELECT 1
		      FROM prediction_market_translation_cache c
		      JOIN target_locale tl ON tl.locale = c.locale
		      WHERE c.market_id = m.id
		    )
		  )
		ORDER BY priority ASC, m.updated_at DESC, m.id DESC
		LIMIT $2
	`, pq.Array(locales), limit, pq.Array(tickers))
	if err != nil {
		return nil, fmt.Errorf("list translation candidates: %w", err)
	}
	defer rows.Close()

	out := []MarketCopy{}
	for rows.Next() {
		var market MarketCopy
		var translations []byte
		var priority int
		if err := rows.Scan(&market.ID, &market.Ticker, &market.Title, &market.Description, &translations, &priority); err != nil {
			return nil, fmt.Errorf("scan translation candidate: %w", err)
		}
		market.Translations = json.RawMessage(translations)
		out = append(out, market)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repository) CountUntranslated(ctx context.Context, locales []string, tickers []string) (map[string]int, error) {
	locales = NormalizeLocales(locales)
	tickers = ParseTickerList(strings.Join(tickers, ","))
	out := make(map[string]int, len(locales))
	for _, locale := range locales {
		out[locale] = 0
	}

	rows, err := r.db.QueryContext(ctx, `
		WITH target_locale AS (
			SELECT unnest($1::text[]) AS locale
		)
		SELECT tl.locale, COUNT(m.id)::int AS missing_count
		FROM target_locale tl
		LEFT JOIN prediction_markets m
		  ON btrim(m.title) <> ''
		 AND (COALESCE(cardinality($2::text[]), 0) = 0 OR m.ticker = ANY($2::text[]))
		 AND (
		   NOT (COALESCE(m.translations, '{}'::jsonb) ? tl.locale)
		   OR COALESCE(m.translations->tl.locale->>'title', '') = ''
		   OR (COALESCE(m.description, '') <> ''
		       AND COALESCE(m.translations->tl.locale->>'description', '') = '')
		 )
		GROUP BY tl.locale
	`, pq.Array(locales), pq.Array(tickers))
	if err != nil {
		return nil, fmt.Errorf("count untranslated markets: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var locale string
		var count int
		if err := rows.Scan(&locale, &count); err != nil {
			return nil, fmt.Errorf("scan untranslated market count: %w", err)
		}
		out[locale] = count
	}
	return out, rows.Err()
}

func (r *Repository) CacheHashes(ctx context.Context, marketID string, locales []string) (map[string]string, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT locale, source_hash
		FROM prediction_market_translation_cache
		WHERE market_id = $1::uuid
		  AND locale = ANY($2::text[])
	`, marketID, pq.Array(NormalizeLocales(locales)))
	if err != nil {
		return nil, fmt.Errorf("list translation cache hashes: %w", err)
	}
	defer rows.Close()

	out := map[string]string{}
	for rows.Next() {
		var locale, sourceHash string
		if err := rows.Scan(&locale, &sourceHash); err != nil {
			return nil, fmt.Errorf("scan translation cache hash: %w", err)
		}
		out[locale] = sourceHash
	}
	return out, rows.Err()
}

func (r *Repository) UpsertTranslation(
	ctx context.Context,
	marketID string,
	locale string,
	sourceHash string,
	translation Translation,
	meta TranslationMeta,
) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO prediction_market_translation_cache
			(market_id, locale, source_hash, title, description, provider, model,
			 prompt_version, machine_generated, reviewed, error_message)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, TRUE, FALSE, NULL)
		ON CONFLICT (market_id, locale) DO UPDATE SET
			source_hash = EXCLUDED.source_hash,
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			provider = EXCLUDED.provider,
			model = EXCLUDED.model,
			prompt_version = EXCLUDED.prompt_version,
			machine_generated = TRUE,
			reviewed = FALSE,
			error_message = NULL,
			updated_at = now()
	`, marketID, locale, sourceHash, translation.Title, translation.Description,
		meta.Provider, meta.Model, meta.Prompt)
	if err != nil {
		return fmt.Errorf("upsert translation cache: %w", err)
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE prediction_markets
		SET translations = jsonb_set(
		      COALESCE(translations, '{}'::jsonb),
		      ARRAY[$2],
		      jsonb_build_object('title', $3::text, 'description', $4::text),
		      true
		    ),
		    updated_at = now()
		WHERE id = $1::uuid
	`, marketID, locale, translation.Title, translation.Description)
	if err != nil {
		return fmt.Errorf("update market translations: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}
