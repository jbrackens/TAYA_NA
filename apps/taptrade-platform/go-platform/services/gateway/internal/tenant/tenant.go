// Package tenant carries the active tenant id through a request's context for
// the multi-tenancy foundation (ADR-0005, P3-01 epic step 2).
//
// Today every request resolves to the single live tenant (Default). The
// resolver Middleware is the seam: when the platform onboards a second tenant,
// the resolution source upgrades here — to the authenticated principal's tenant
// (an auth-service session claim) or a trusted edge signal — WITHOUT touching
// the call sites that read From(ctx).
//
// IMPORTANT: nothing scopes queries on this value yet. Repository-boundary
// scoping (every query gains `AND tenant_id = $tenant`) is epic step 3, gated
// by RLS (step 4). This package only plumbs the value so step 3 has a single,
// trusted place to read it.
package tenant

import (
	"context"
	"net/http"
)

// Default is the single live tenant until multi-tenant onboarding ships. It
// matches the DEFAULT on the tenant_id columns (migration 037).
const Default = "hula"

type ctxKey struct{}

// With returns a context carrying the given tenant id. An empty id falls back
// to Default so callers never propagate an unscoped ("") tenant.
func With(ctx context.Context, id string) context.Context {
	if id == "" {
		id = Default
	}
	return context.WithValue(ctx, ctxKey{}, id)
}

// From returns the tenant id on the context, or Default when none is set. Step
// 3 will read this at the repository boundary; a missing value resolving to
// Default keeps single-tenant behavior correct during the migration.
func From(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKey{}).(string); ok && v != "" {
		return v
	}
	return Default
}

// Middleware resolves the active tenant for each request and stores it on the
// context. Place it AFTER auth in the chain so the upgrade can read the
// authenticated principal. Until multi-tenant onboarding it resolves to
// Default for every request — the resolution source is the single thing that
// changes when a second tenant arrives.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Resolution source upgrade point (multi-tenant): derive the tenant
		// from the authenticated principal / trusted edge here instead of the
		// constant. Deliberately NOT read from a client-supplied header — that
		// would let a caller select another tenant's data.
		ctx := With(r.Context(), Default)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
