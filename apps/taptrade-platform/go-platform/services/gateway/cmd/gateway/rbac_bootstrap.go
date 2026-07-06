package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strings"

	"taptrade/gateway/internal/rbac"
)

// runRBACBootstrap provisions the first back-office super-admin in an
// environment where none exists. Production is fail-closed by design: migration
// 027 seeds roles/permissions but no staff accounts, so an operator runs this
// once to create the initial super-admin. Idempotent — re-running ensures the
// account holds the super-admin role without disturbing an existing one.
//
// Inputs (env):
//
//	RBAC_BOOTSTRAP_EMAIL     required
//	RBAC_BOOTSTRAP_PASSWORD  required, >= 8 chars
//	RBAC_BOOTSTRAP_NAME      optional (defaults to the email local-part)
//	GATEWAY_DB_DSN           required
//
// Usage: gateway rbac-bootstrap
func runRBACBootstrap(_ []string) int {
	email := strings.TrimSpace(os.Getenv("RBAC_BOOTSTRAP_EMAIL"))
	password := os.Getenv("RBAC_BOOTSTRAP_PASSWORD")
	name := strings.TrimSpace(os.Getenv("RBAC_BOOTSTRAP_NAME"))
	if email == "" || password == "" {
		fmt.Fprintln(os.Stderr, "rbac-bootstrap: set RBAC_BOOTSTRAP_EMAIL and RBAC_BOOTSTRAP_PASSWORD (and GATEWAY_DB_DSN)")
		return 2
	}
	if name == "" {
		if at := strings.IndexByte(email, '@'); at > 0 {
			name = email[:at]
		} else {
			name = email
		}
	}
	dsn := strings.TrimSpace(os.Getenv("GATEWAY_DB_DSN"))
	if dsn == "" {
		fmt.Fprintln(os.Stderr, "rbac-bootstrap: GATEWAY_DB_DSN is not set")
		return 2
	}
	driver := os.Getenv("GATEWAY_DB_DRIVER")
	if driver == "" {
		driver = "postgres"
	}

	db, err := sql.Open(driver, dsn)
	if err != nil {
		fmt.Fprintf(os.Stderr, "rbac-bootstrap: open db: %v\n", err)
		return 1
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		fmt.Fprintf(os.Stderr, "rbac-bootstrap: connect db: %v\n", err)
		return 1
	}

	ctx := context.Background()
	repo := rbac.NewSQLRepository(db)
	svc := rbac.NewService(repo)

	user, err := svc.CreateUser(ctx, rbac.CreateUserInput{
		Name:     name,
		Email:    email,
		Password: password,
		RoleIDs:  []string{rbac.SystemFullAccessRoleID},
	}, rbac.Actor{Unconstrained: true})
	switch {
	case err == nil:
		fmt.Printf("rbac-bootstrap: created super-admin %s (id %s)\n", user.Email, user.ID)
		return 0
	case errors.Is(err, rbac.ErrDuplicateEmail):
		// Idempotent path: ensure the existing account has the super-admin role,
		// additively (don't replace any other roles it holds).
		existing, gerr := repo.GetUserByEmail(ctx, email)
		if gerr != nil || existing == nil {
			fmt.Fprintf(os.Stderr, "rbac-bootstrap: account exists but lookup failed: %v\n", gerr)
			return 1
		}
		if _, aerr := db.ExecContext(ctx,
			`INSERT INTO user_roles (user_id, role_id, granted_by)
			 VALUES ($1, $2, 'bootstrap') ON CONFLICT (user_id, role_id) DO NOTHING`,
			existing.ID, rbac.SystemFullAccessRoleID); aerr != nil {
			fmt.Fprintf(os.Stderr, "rbac-bootstrap: ensure super-admin role: %v\n", aerr)
			return 1
		}
		fmt.Printf("rbac-bootstrap: %s already existed; ensured super-admin role\n", email)
		return 0
	default:
		// Most likely the roles aren't seeded yet (run migrations first) or the
		// input failed validation.
		fmt.Fprintf(os.Stderr, "rbac-bootstrap: %v\n", err)
		return 1
	}
}
