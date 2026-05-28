package http

import (
	"encoding/json"
	"errors"
	"io"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/alphacashier"
	"phoenix-revival/gateway/internal/rbac"
	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
)

const (
	alphaCashierReadPermission  = "cashier:read"
	alphaCashierWritePermission = "cashier:write"
)

func registerAlphaCashierAdminRoutes(mux *stdhttp.ServeMux, svc *alphacashier.Service, rbacSvc *rbac.Service) {
	mux.Handle("/api/v1/admin/cashier/alpha/deposits", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAlphaCashierPermission(r, rbacSvc, alphaCashierReadPermission); err != nil {
			return err
		}
		deposits, err := svc.ListAdminDepositIntents(r.Context(), alphacashier.DepositIntentFilter{
			Status: r.URL.Query().Get("status"),
			UserID: r.URL.Query().Get("userId"),
			TxHash: r.URL.Query().Get("txHash"),
			Limit:  parseAlphaCashierLimit(r),
		})
		if err != nil {
			return mapAlphaCashierAdminError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"depositIntents": deposits})
	}))

	mux.Handle("/api/v1/admin/cashier/alpha/reconciliation", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAlphaCashierPermission(r, rbacSvc, alphaCashierReadPermission); err != nil {
			return err
		}
		summary, err := svc.ReconciliationSummary(r.Context())
		if err != nil {
			return mapAlphaCashierAdminError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"reconciliation": summary})
	}))

	mux.Handle("/api/v1/admin/cashier/alpha/withdrawals", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAlphaCashierPermission(r, rbacSvc, alphaCashierReadPermission); err != nil {
			return err
		}
		requests, err := svc.ListAdminWithdrawalRequests(r.Context(), r.URL.Query().Get("status"))
		if err != nil {
			return mapAlphaCashierAdminError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"withdrawalRequests": requests})
	}))

	mux.Handle("/api/v1/admin/cashier/alpha/audit-events", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAlphaCashierPermission(r, rbacSvc, alphaCashierReadPermission); err != nil {
			return err
		}
		events, err := svc.ListAuditEvents(r.Context(), alphacashier.AuditEventFilter{
			SubjectType: r.URL.Query().Get("subjectType"),
			SubjectID:   r.URL.Query().Get("subjectId"),
			EventType:   r.URL.Query().Get("eventType"),
			ActorType:   r.URL.Query().Get("actorType"),
			ActorID:     r.URL.Query().Get("actorId"),
			Limit:       parseAlphaCashierLimit(r),
		})
		if err != nil {
			return mapAlphaCashierAdminError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"auditEvents": events})
	}))

	mux.Handle("/api/v1/admin/cashier/alpha/withdrawals/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAlphaCashierPermission(r, rbacSvc, alphaCashierWritePermission); err != nil {
			return err
		}
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/admin/cashier/alpha/withdrawals/"), "/")
		parts := strings.Split(rest, "/")
		if len(parts) != 2 || parts[0] == "" {
			return httpx.NotFound("withdrawal request not found")
		}
		var body struct {
			ReviewNote string `json:"reviewNote"`
			TxHash     string `json:"txHash"`
		}
		if r.Body != nil {
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil && !errors.Is(err, io.EOF) {
				return httpx.BadRequest("invalid request body", nil)
			}
		}
		actorID := adminActorFromRequest(r)
		var (
			req *alphacashier.WithdrawalRequest
			err error
		)
		switch parts[1] {
		case "approve":
			req, err = svc.ApproveWithdrawal(r.Context(), parts[0], actorID, body.ReviewNote)
		case "reject":
			req, err = svc.RejectWithdrawal(r.Context(), parts[0], actorID, body.ReviewNote)
		case "mark-broadcasted":
			req, err = svc.MarkWithdrawalBroadcasted(r.Context(), parts[0], actorID, body.TxHash)
		case "mark-completed":
			req, err = svc.MarkWithdrawalCompleted(r.Context(), parts[0], actorID)
		default:
			return httpx.NotFound("withdrawal action not found")
		}
		if err != nil {
			return mapAlphaCashierAdminError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"withdrawalRequest": req})
	}))
}

func requireAlphaCashierPermission(r *stdhttp.Request, rbacSvc *rbac.Service, permission string) error {
	if rbacSvc == nil {
		return requireAdminRole(r)
	}
	return requireRBACPermission(r, rbacSvc, permission)
}

func parseAlphaCashierLimit(r *stdhttp.Request) int {
	raw := strings.TrimSpace(r.URL.Query().Get("limit"))
	if raw == "" {
		return 0
	}
	limit, err := strconv.Atoi(raw)
	if err != nil {
		return 0
	}
	return limit
}

func mapAlphaCashierAdminError(err error) error {
	switch {
	case errors.Is(err, alphacashier.ErrDisabled):
		return httpx.Forbidden("alpha cashier is disabled")
	case errors.Is(err, alphacashier.ErrWithdrawalsDisabled):
		return httpx.Forbidden("alpha withdrawals are disabled")
	case errors.Is(err, alphacashier.ErrInvalidStatus):
		return httpx.Conflict("withdrawal request is not in a valid status for this action", nil)
	case errors.Is(err, alphacashier.ErrReviewNoteRequired):
		return httpx.BadRequest("review note is required", map[string]any{"field": "reviewNote"})
	case errors.Is(err, alphacashier.ErrWithdrawalNotFound):
		return httpx.NotFound("withdrawal request not found")
	case errors.Is(err, alphacashier.ErrTxHashInvalid):
		return httpx.BadRequest("txHash must be a valid EVM transaction hash", map[string]any{"field": "txHash"})
	case errors.Is(err, wallet.ErrInsufficientFunds):
		return httpx.BadRequest("insufficient wallet balance", map[string]any{"field": "amountCents"})
	case errors.Is(err, wallet.ErrReservationNotFound), errors.Is(err, wallet.ErrReservationNotHeld), errors.Is(err, wallet.ErrReservationExpired):
		return httpx.Conflict("withdrawal wallet reservation cannot be resolved", nil)
	default:
		return httpx.Internal("alpha cashier admin operation failed", err)
	}
}
