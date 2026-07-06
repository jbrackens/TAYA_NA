# Prediction Bounded Contexts (Scaffold)

This package contains initial scaffolding for the prediction platform pivot:

- `markets`: market lifecycle and template-driven market creation
- `orders`: bot order entry/cancellation and execution flow
- `settlement`: source snapshots and deterministic resolution
- `botauth`: bot account and API key lifecycle
- `common`: shared IDs and core specs
- `PredictionConfig` + `prediction.conf`: market-factory scheduler configuration

These interfaces are intentionally thin and will be wired into routes,
repositories, and projections during Phase 1/2 execution.
