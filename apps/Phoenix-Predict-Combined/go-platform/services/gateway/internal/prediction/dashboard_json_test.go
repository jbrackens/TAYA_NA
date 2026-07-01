package prediction

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestDashboardMoverJSONExposesPointAliases(t *testing.T) {
	mover := DashboardMover{
		MarketID:           "market-1",
		Ticker:             "MLBB-FINAL-G1",
		Title:              "Listed MLBB team wins game one",
		YesPriceCentsStart: 52,
		YesPriceCentsNow:   64,
		VolumeCents:        12500,
	}

	data, err := json.Marshal(mover)
	if err != nil {
		t.Fatalf("marshal dashboard mover: %v", err)
	}
	body := string(data)

	for _, want := range []string{
		`"yesPricePointsCentsStart":52`,
		`"yesPricePointsCentsNow":64`,
		`"volumePointsCents":12500`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("dashboard mover JSON missing %s in %s", want, body)
		}
	}
	for _, retired := range []string{
		`"yesPriceCentsStart"`,
		`"yesPriceCentsNow"`,
		`"volumeCents"`,
	} {
		if strings.Contains(body, retired) {
			t.Fatalf("dashboard mover should not emit retired alias %s in %s", retired, body)
		}
	}
}

func TestDashboardVolumeStatsJSONExposesPointAliases(t *testing.T) {
	stats := DashboardVolumeStats{
		Since:            time.Date(2026, 6, 25, 12, 0, 0, 0, time.UTC),
		WindowSeconds:    86400,
		TotalVolumeCents: 25000,
		TradeCount:       9,
		TopMovers: []DashboardMover{{
			MarketID:           "market-1",
			Ticker:             "MLBB-FINAL-G1",
			Title:              "Listed MLBB team wins game one",
			YesPriceCentsStart: 52,
			YesPriceCentsNow:   64,
			VolumeCents:        12500,
		}},
	}

	data, err := json.Marshal(stats)
	if err != nil {
		t.Fatalf("marshal dashboard stats: %v", err)
	}
	body := string(data)

	for _, want := range []string{
		`"totalVolumePointsCents":25000`,
		`"unit":"PTS"`,
		`"topMovers"`,
		`"volumePointsCents":12500`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("dashboard volume stats JSON missing %s in %s", want, body)
		}
	}
	for _, retired := range []string{
		`"totalVolumeCents"`,
		`"yesPriceCentsStart"`,
		`"yesPriceCentsNow"`,
		`"volumeCents"`,
	} {
		if strings.Contains(body, retired) {
			t.Fatalf("dashboard volume stats should not emit retired alias %s in %s", retired, body)
		}
	}
}

func TestCollateralDriftAlertJSONExposesPointAliases(t *testing.T) {
	alert := CollateralDriftAlert{
		MarketID:         "market-1",
		Ticker:           "MLBB-FINAL-G1",
		AdjustmentCount:  2,
		MaxDriftCents:    120,
		TotalDriftCents:  180,
		LatestAdjustedAt: time.Date(2026, 6, 25, 12, 0, 0, 0, time.UTC),
		LatestReason:     "reconciliation adjustment",
	}

	data, err := json.Marshal(alert)
	if err != nil {
		t.Fatalf("marshal drift alert: %v", err)
	}
	body := string(data)

	for _, want := range []string{
		`"maxDriftPointsCents":120`,
		`"totalDriftPointsCents":180`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("drift alert JSON missing %s in %s", want, body)
		}
	}
	for _, retired := range []string{
		`"maxDriftCents"`,
		`"totalDriftCents"`,
	} {
		if strings.Contains(body, retired) {
			t.Fatalf("drift alert should not emit retired alias %s in %s", retired, body)
		}
	}
}
