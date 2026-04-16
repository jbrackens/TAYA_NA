package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/lib/pq"
)

func main() {
	driver := os.Getenv("GATEWAY_DB_DRIVER")
	if strings.TrimSpace(driver) == "" {
		driver = "postgres"
	}

	dsn := os.Getenv("GATEWAY_DB_DSN")
	if strings.TrimSpace(dsn) == "" {
		log.Fatal("error: GATEWAY_DB_DSN environment variable not set\n\nUsage:\n  GATEWAY_DB_DSN='postgres://user:pass@localhost:5432/predict?sslmode=disable' go run ./cmd/seed")
	}

	// Find seed file
	seedFile := os.Getenv("SEED_FILE")
	if seedFile == "" {
		seedFile = findSeedFile()
	}

	if seedFile == "" {
		log.Fatal("error: seed file not found. Set SEED_FILE env or run from the gateway directory.")
	}

	// Read seed SQL
	seedSQL, err := os.ReadFile(seedFile)
	if err != nil {
		log.Fatalf("error: could not read seed file %s: %v", seedFile, err)
	}

	// Connect to database
	db, err := sql.Open(driver, dsn)
	if err != nil {
		log.Fatalf("error: could not open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("error: could not connect to database: %v", err)
	}

	fmt.Printf("Connected to database. Running seed from %s...\n", seedFile)

	// Execute seed SQL
	result, err := db.Exec(string(seedSQL))
	if err != nil {
		log.Fatalf("error: seed failed: %v", err)
	}

	rows, _ := result.RowsAffected()
	fmt.Printf("Seed completed successfully. Rows affected: %d\n", rows)

	// Print summary
	printSummary(db)
}

func findSeedFile() string {
	// Check common locations
	candidates := []string{
		"seed-data/seed_prediction.sql",
		"../seed-data/seed_prediction.sql",
		"../../seed-data/seed_prediction.sql",
	}

	// Also try relative to executable
	if exePath, err := os.Executable(); err == nil {
		candidates = append(candidates,
			filepath.Join(filepath.Dir(exePath), "..", "..", "seed-data", "seed_prediction.sql"),
		)
	}

	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			abs, _ := filepath.Abs(c)
			return abs
		}
	}
	return ""
}

func printSummary(db *sql.DB) {
	fmt.Println("\n--- Seed Data Summary ---")

	tables := []struct {
		name  string
		query string
	}{
		{"Categories", "SELECT COUNT(*) FROM prediction_categories"},
		{"Series", "SELECT COUNT(*) FROM prediction_series"},
		{"Events", "SELECT COUNT(*) FROM prediction_events"},
		{"Markets", "SELECT COUNT(*) FROM prediction_markets"},
		{"Orders", "SELECT COUNT(*) FROM prediction_orders"},
		{"Positions", "SELECT COUNT(*) FROM prediction_positions"},
		{"Trades", "SELECT COUNT(*) FROM prediction_trades"},
		{"Users", "SELECT COUNT(*) FROM punters"},
		{"Wallets", "SELECT COUNT(*) FROM wallets"},
	}

	for _, t := range tables {
		var count int
		if err := db.QueryRow(t.query).Scan(&count); err != nil {
			fmt.Printf("  %-14s error: %v\n", t.name, err)
		} else {
			fmt.Printf("  %-14s %d\n", t.name, count)
		}
	}

	// List open markets
	fmt.Println("\n--- Open Markets ---")
	rows, err := db.Query(`
		SELECT ticker, title, yes_price_cents, volume_cents
		FROM prediction_markets WHERE status = 'open'
		ORDER BY volume_cents DESC LIMIT 10`)
	if err != nil {
		fmt.Printf("  error: %v\n", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var ticker, title string
		var yesPrice int
		var volume int64
		if err := rows.Scan(&ticker, &title, &yesPrice, &volume); err != nil {
			continue
		}
		fmt.Printf("  %-20s YES:%d%%  Vol:$%-8d %s\n", ticker, yesPrice, volume/100, truncate(title, 40))
	}
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-3] + "..."
}
