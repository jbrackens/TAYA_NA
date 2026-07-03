package http

import (
	"context"
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/makerchecker"
	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
)

// dualApprovalThresholdCents is the four-eyes threshold for manual balance
// adjustments (P0-6, decision 2026-07-02: $100 = 10,000 points-cents). At or
// above this, an adjustment needs a second approver (maker != checker). A
// regime may retune this; it is a constant, not env config, to avoid an
// operator silently lowering the control.
const dualApprovalThresholdCents int64 = 10_000

// requireDualApproval refuses a direct wallet mutation whose amount meets the
// threshold, pointing the caller at the maker-checker submission endpoint.
func requireDualApproval(amountCents int64) error {
	if amountCents >= dualApprovalThresholdCents {
		return httpx.Conflict(
			"adjustments at or above the dual-approval threshold require a second approver; submit via POST /api/v1/admin/finance/adjustments",
			map[string]any{"thresholdPointsCents": dualApprovalThresholdCents})
	}
	return nil
}

// makerCheckerStore is what the routes need from the store.
type makerCheckerStore interface {
	CreatePending(ctx context.Context, a makerchecker.Action) (*makerchecker.Action, error)
	ListByStatus(ctx context.Context, status string, limit, offset int) ([]makerchecker.Action, error)
	GetAction(ctx context.Context, id int64) (*makerchecker.Action, error)
	Approve(ctx context.Context, id int64, checkerID string) (*makerchecker.Action, error)
	Reject(ctx context.Context, id int64, checkerID, reason string) (*makerchecker.Action, error)
}

// adjustmentExecutor is the wallet capability the approve/direct paths use.
// *wallet.Service satisfies it.
type adjustmentExecutor interface {
	Credit(ctx context.Context, req wallet.MutationRequest) (wallet.LedgerEntry, error)
	Debit(ctx context.Context, req wallet.MutationRequest) (wallet.LedgerEntry, error)
}

func mapMakerCheckerError(err error) error {
	switch {
	case errors.Is(err, makerchecker.ErrNotFound):
		return httpx.NotFound("pending action not found")
	case errors.Is(err, makerchecker.ErrNotPending):
		return httpx.Conflict("this action has already been decided", nil)
	case errors.Is(err, makerchecker.ErrSameActor):
		return httpx.Forbidden("the maker cannot approve or reject their own action")
	case errors.Is(err, makerchecker.ErrReasonEmpty):
		return httpx.BadRequest("a reason is required", map[string]any{"field": "reason"})
	case errors.Is(err, makerchecker.ErrInvalid):
		return httpx.BadRequest("invalid pending action", nil)
	default:
		return httpx.Internal("maker-checker operation failed", err)
	}
}

// executeAdjustment performs the credit/debit for an approved (or below-
// threshold) adjustment, keyed by the idempotency key so it runs at most once.
func executeAdjustment(ctx context.Context, exec adjustmentExecutor, direction, userID string, amountCents int64, idempotencyKey, reason string) (wallet.LedgerEntry, error) {
	req := wallet.MutationRequest{UserID: userID, AmountCents: amountCents, IdempotencyKey: idempotencyKey, Reason: reason}
	if direction == "debit" {
		return exec.Debit(ctx, req)
	}
	return exec.Credit(ctx, req)
}

// registerMakerCheckerRoutes wires the dual-approval back office for manual
// wallet adjustments (PAM spec §7 Permission Model + §25 Admin Operations and
// Configuration).
//
//	POST /api/v1/admin/finance/adjustments  {userId,direction,amountPointsCents,reason}  (finances:write)
//	     below threshold → executed directly; at/above → queued for a second approver.
//	GET  /api/v1/admin/finance/adjustments/pending?status=                                (finances:read)
//	POST /api/v1/admin/finance/adjustments/pending/{id}/approve                           (finances:write, maker!=checker)
//	POST /api/v1/admin/finance/adjustments/pending/{id}/reject  {reason}                  (finances:write, maker!=checker)
func registerMakerCheckerRoutes(mux *stdhttp.ServeMux, store makerCheckerStore, exec adjustmentExecutor) {
	mux.Handle("/api/v1/admin/finance/adjustments", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "finances:write"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		var body struct {
			UserID            string `json:"userId"`
			Direction         string `json:"direction"`
			AmountPointsCents int64  `json:"amountPointsCents"`
			Reason            string `json:"reason"`
			IdempotencyKey    string `json:"idempotencyKey"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		body.UserID = strings.TrimSpace(body.UserID)
		body.Direction = strings.ToLower(strings.TrimSpace(body.Direction))
		body.Reason = strings.TrimSpace(body.Reason)
		body.IdempotencyKey = strings.TrimSpace(body.IdempotencyKey)
		if body.UserID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}
		if body.Direction != "credit" && body.Direction != "debit" {
			return httpx.BadRequest("direction must be credit or debit", map[string]any{"field": "direction"})
		}
		if body.AmountPointsCents <= 0 {
			return httpx.BadRequest("amountPointsCents must be greater than zero", map[string]any{"field": "amountPointsCents"})
		}
		if body.IdempotencyKey == "" {
			return httpx.BadRequest("idempotencyKey is required", map[string]any{"field": "idempotencyKey"})
		}
		if body.Reason == "" {
			return httpx.BadRequest("reason is required", map[string]any{"field": "reason"})
		}
		if err := validateLaunchFacingReason("reason", body.Reason); err != nil {
			return err
		}
		maker := userIDFromRequest(r)

		// Below threshold: execute directly, as before (audited by the wallet
		// mutation path is not — so audit here for the manual-adjustment trail).
		if body.AmountPointsCents < dualApprovalThresholdCents {
			entry, err := executeAdjustment(r.Context(), exec, body.Direction, body.UserID, body.AmountPointsCents, body.IdempotencyKey, body.Reason)
			if err != nil {
				return mapWalletError(err)
			}
			recordProviderOpsAuditAction(maker, "finance.adjustment_executed", body.UserID, map[string]any{
				"direction": body.Direction, "amountPointsCents": body.AmountPointsCents,
				"idempotencyKey": body.IdempotencyKey, "reason": body.Reason,
				"balancePointsCents": entry.BalanceCents, "dualApproval": false,
			})
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"executed": true, "balancePointsCents": entry.BalanceCents})
		}

		// At/above threshold: queue for a second approver.
		action, err := store.CreatePending(r.Context(), makerchecker.Action{
			SubjectID: body.UserID, Direction: body.Direction, AmountCents: body.AmountPointsCents,
			Reason: body.Reason, IdempotencyKey: body.IdempotencyKey, MakerID: maker,
		})
		if err != nil {
			return mapMakerCheckerError(err)
		}
		recordProviderOpsAuditAction(maker, "finance.adjustment_proposed", body.UserID, map[string]any{
			"pendingId": action.ID, "direction": body.Direction, "amountPointsCents": body.AmountPointsCents,
			"reason": body.Reason,
		})
		return httpx.WriteJSON(w, stdhttp.StatusAccepted, map[string]any{"pending": action})
	}))

	mux.Handle("/api/v1/admin/finance/adjustments/pending", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "finances:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		status := strings.TrimSpace(r.URL.Query().Get("status"))
		if status == "" {
			status = "pending"
		}
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
		actions, err := store.ListByStatus(r.Context(), status, limit, offset)
		if err != nil {
			return httpx.Internal("failed to list pending actions", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"actions": actions, "total": len(actions)})
	}))

	const pendingPrefix = "/api/v1/admin/finance/adjustments/pending/"
	mux.Handle(pendingPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "finances:write"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, pendingPrefix), "/")
		parts := strings.Split(rest, "/")
		if len(parts) != 2 {
			return httpx.NotFound("unknown maker-checker path")
		}
		id, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return httpx.BadRequest("invalid action id", nil)
		}
		checker := userIDFromRequest(r)

		switch parts[1] {
		case "approve":
			action, err := store.Approve(r.Context(), id, checker)
			if err != nil {
				return mapMakerCheckerError(err)
			}
			// Execute the approved adjustment, idempotency-keyed so a retry
			// cannot double-move money.
			entry, execErr := executeAdjustment(r.Context(), exec,
				action.Direction, action.SubjectID, action.AmountCents, action.IdempotencyKey, action.Reason)
			if execErr != nil {
				// The action is approved but the wallet move failed. Audit the
				// failure; the idempotency key makes a later retry safe.
				recordProviderOpsAuditAction(checker, "finance.adjustment_approve_failed", action.SubjectID, map[string]any{
					"pendingId": id, "error": "wallet execution failed",
				})
				return mapWalletError(execErr)
			}
			recordProviderOpsAuditAction(checker, "finance.adjustment_approved", action.SubjectID, map[string]any{
				"pendingId": id, "makerId": action.MakerID, "direction": action.Direction,
				"amountPointsCents": action.AmountCents, "balancePointsCents": entry.BalanceCents,
			})
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"approved": true, "balancePointsCents": entry.BalanceCents})
		case "reject":
			var body struct {
				Reason string `json:"reason"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			reason := strings.TrimSpace(body.Reason)
			if reason != "" {
				if err := validateLaunchFacingReason("reason", reason); err != nil {
					return err
				}
			}
			action, err := store.Reject(r.Context(), id, checker, reason)
			if err != nil {
				return mapMakerCheckerError(err)
			}
			recordProviderOpsAuditAction(checker, "finance.adjustment_rejected", action.SubjectID, map[string]any{
				"pendingId": id, "makerId": action.MakerID, "reason": reason,
			})
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"rejected": true})
		default:
			return httpx.NotFound("unknown maker-checker path")
		}
	}))
}
