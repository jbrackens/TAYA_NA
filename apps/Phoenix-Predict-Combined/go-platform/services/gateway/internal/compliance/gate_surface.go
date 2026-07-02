package compliance

import stdhttp "net/http"

// Surface identifies the guarded action a compliance gate protects. Distinct
// values keep denial logs/audits attributable per surface.
// Registration (account creation) is deliberately NOT a surface: identity
// creation is allowed everywhere; guarded trading and legacy external-value
// compatibility paths are not. See
// docs/compliance/geofencing-kyc.md.
type Surface string

const (
	SurfaceTrade    Surface = "trade"
	SurfaceDeposit  Surface = "deposit"
	SurfaceWithdraw Surface = "withdraw"
)

// GateFunc evaluates the jurisdiction/KYC gates for an authenticated request
// against one surface. Implemented by the HTTP layer (which owns the gate
// instances) and injected into compatibility packages as a package var so
// packages stay independently testable. A nil GateFunc is a no-op.
type GateFunc func(r *stdhttp.Request, userID string, surface Surface) error
