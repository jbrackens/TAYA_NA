# SB-008/SB-306 Operator Preset Guide

Date: 2026-03-04

## Purpose

This guide defines runtime preset controls for sportsbook surface composition, without code forks.

## Runtime Keys

1. `SPORTSBOOK_INTEGRATION_MODE`
   - allowed values: `full`, `module`, `odds_feed`
   - default: `full`
2. `SPORTSBOOK_LANDING_WIDGETS`
   - comma-separated landing widget IDs (optional override)
   - if empty, mode defaults are used
3. `SPORTSBOOK_ESPORTS_HOME_MODULES`
   - comma-separated `/esports-bets` module IDs (optional override)
   - if empty, mode defaults are used
4. `SPORTSBOOK_ACCOUNT_MODULES`
   - comma-separated `/account` module IDs (optional override)
   - if empty, mode defaults are used
5. `SPORTSBOOK_PROMOTIONS_MODULES`
   - comma-separated `/promotions` module IDs (optional override)
   - if empty, mode defaults are used
6. `SPORTSBOOK_FIXTURE_OVERLAYS`
   - comma-separated `/esports-bets/[gameFilter]/match/[fixtureId]` overlay IDs (optional override)
   - if empty, mode defaults are used

## Landing Widget IDs

1. `about_vie`
2. `features_and_modes`
3. `esports_offering`
4. `about_eeg`

## Esports Home Module IDs

1. `promo_carousel`
2. `tabs`
3. `results_tab`
4. `fixtures`
5. `odds_format_select`

## Account Module IDs

1. `personal_details`
2. `promo_availability`

## Promotions Module IDs

1. `page_content`
2. `promo_availability`

## Fixture Overlay IDs

1. `stale_warning`
2. `match_tracker`
3. `stats_centre`

## Mode Defaults

1. `full`
   - landing widgets: all
   - esports modules: `promo_carousel,tabs,results_tab,fixtures,odds_format_select`
   - account modules: `personal_details,promo_availability`
   - promotions modules: `page_content,promo_availability`
   - fixture overlays: `stale_warning,match_tracker,stats_centre`
2. `module`
   - landing widgets: `about_vie,features_and_modes`
   - esports modules: `tabs,results_tab,fixtures,odds_format_select`
   - account modules: `personal_details,promo_availability`
   - promotions modules: `page_content,promo_availability`
   - fixture overlays: `stale_warning,match_tracker,stats_centre`
3. `odds_feed`
   - landing widgets: `about_vie`
   - esports modules: `fixtures,odds_format_select`
   - account modules: `personal_details`
   - promotions modules: `page_content`
   - fixture overlays: none (all hidden by default)

## Example Presets

1. Full brand experience:
```env
SPORTSBOOK_INTEGRATION_MODE=full
SPORTSBOOK_LANDING_WIDGETS=
SPORTSBOOK_ESPORTS_HOME_MODULES=
```

2. Feed-first sportsbook shell:
```env
SPORTSBOOK_INTEGRATION_MODE=odds_feed
SPORTSBOOK_LANDING_WIDGETS=about_vie
SPORTSBOOK_ESPORTS_HOME_MODULES=fixtures,odds_format_select
```

3. Custom module mix with explicit overrides:
```env
SPORTSBOOK_INTEGRATION_MODE=module
SPORTSBOOK_LANDING_WIDGETS=about_vie,esports_offering
SPORTSBOOK_ESPORTS_HOME_MODULES=tabs,fixtures,odds_format_select
SPORTSBOOK_ACCOUNT_MODULES=personal_details,promo_availability
SPORTSBOOK_PROMOTIONS_MODULES=page_content,promo_availability
SPORTSBOOK_FIXTURE_OVERLAYS=match_tracker,stats_centre,stale_warning
```

## Notes

1. Invalid IDs are ignored by parser.
2. Duplicate IDs are deduplicated in first-seen order.
3. Empty override falls back to mode defaults.
4. All override keys use the same shared parser behavior (`parseConfigList` / `resolveConfigList`) for consistent validation across surfaces.
