-- 033_drop_dead_sportsbook_tables.sql
-- Audit ORG-04 / strategy §4 (P2-09). Drops the legacy sportsbook tables from
-- migrations 002-013 that the prediction platform NEVER reads or writes. Each
-- was verified to have ZERO references in the gateway Go code before inclusion
-- here (grep over internal/ + cmd/ for FROM/INTO/JOIN/UPDATE/REFERENCES/DELETE).
--
-- DELIBERATELY KEPT (still referenced by live prediction code, despite
-- sportsbook-sounding names): punters (user table), player_bonuses / campaigns /
-- campaign_rules / wagering_contributions (the live bonus engine), banners /
-- content_blocks / content_pages (the live CMS), wallets / ledger_entries,
-- audit_logs. Those are NOT touched here.
--
-- Dropped in FK-child-first order. Verified (on a fresh PostgreSQL 16) that all
-- FK dependencies are WITHIN this cluster — no kept table (014+ prediction
-- schema, bonus engine, CMS, ledger) references any of them — so no CASCADE is
-- needed and dropping them cannot affect a live table.

-- +goose Up
DROP TABLE IF EXISTS freebets;
DROP TABLE IF EXISTS bet_legs;
DROP TABLE IF EXISTS odds_boosts;
DROP TABLE IF EXISTS bets;
DROP TABLE IF EXISTS incidents;
DROP TABLE IF EXISTS match_timelines;
DROP TABLE IF EXISTS selections;
DROP TABLE IF EXISTS markets;
DROP TABLE IF EXISTS fixtures;
DROP TABLE IF EXISTS tournaments;
DROP TABLE IF EXISTS sports;

-- +goose Down
-- Intentionally NOT reversed. These tables were dead sportsbook residue with no
-- readers/writers in the prediction platform; recreating their stale DDL here
-- would be a maintenance footgun. The original definitions remain in migrations
-- 002-013 (git history) and on the archive/2026-06-pre-cleanup snapshot branch
-- if a full sportsbook restore is ever needed.
SELECT 1;
