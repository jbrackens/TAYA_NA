package compliance

import stdhttp "net/http"

// Surface identifies the money-movement or trading action a compliance gate
// protects. Distinct values keep denial logs/audits attributable per surface.
// Registration (account creation) is deliberately NOT a surface: identity
// creation is allowed everywhere; trading and money movement are not. See
// docs/compliance/geofencing-kyc.md.
type Surface string

const (
	SurfaceTrade    Surface = "trade"
	SurfaceDeposit  Surface = "deposit"
	SurfaceWithdraw Surface = "withdraw"
)

// GateFunc evaluates the jurisdiction/KYC gates for an authenticated request
// against one surface. Implemented by the HTTP layer (which owns the gate
// instances) and injected into the cashier/payments packages as a package
// var — mirrors the payments.KYCGate injection pattern. A nil GateFunc is a
// no-op so packages stay independently testable.
type GateFunc func(r *stdhttp.Request, userID string, surface Surface) error
