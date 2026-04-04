package http

import (
	"encoding/json"
	"errors"
	"fmt"
	stdhttp "net/http"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
)

type walletCorrectionTaskCreateRequest struct {
	UserID                   string `json:"userId"`
	Reason                   string `json:"reason"`
	Details                  string `json:"details,omitempty"`
	SuggestedAdjustmentCents int64  `json:"suggestedAdjustmentCents,omitempty"`
}

type walletCorrectionTaskResolveRequest struct {
	ResolutionNote  string `json:"resolutionNote,omitempty"`
	AdjustmentType  string `json:"adjustmentType,omitempty"`
	AdjustmentCents int64  `json:"adjustmentCents,omitempty"`
	IdempotencyKey  string `json:"idempotencyKey,omitempty"`
}

func registerAdminWalletCorrectionRoutes(mux *stdhttp.ServeMux, basePath string, walletService *wallet.Service) {
	tasksPath := fmt.Sprintf("%s/wallet/corrections/tasks", basePath)

	mux.Handle(tasksPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}

		switch r.Method {
		case stdhttp.MethodGet:
			includeScan := !strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("includeScan")), "false")
			if includeScan {
				if _, err := walletService.ScanCorrectionTasks(); err != nil {
					return httpx.Internal("failed to scan correction tasks", err)
				}
			}

			items := walletService.ListCorrectionTasks(
				strings.TrimSpace(r.URL.Query().Get("status")),
				strings.TrimSpace(r.URL.Query().Get("userId")),
				parseCorrectionLimit(r.URL.Query().Get("limit")),
			)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"items":   items,
				"summary": summarizeCorrectionTasks(items),
			})
		case stdhttp.MethodPost:
			var request walletCorrectionTaskCreateRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			task, err := walletService.CreateManualCorrectionTask(
				request.UserID,
				request.Reason,
				request.Details,
				request.SuggestedAdjustmentCents,
			)
			if err != nil {
				return mapWalletCorrectionTaskError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
				"task": task,
			})
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	mux.Handle(tasksPath+"/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		rawPath := strings.TrimPrefix(r.URL.Path, tasksPath+"/")
		pathParts := strings.Split(rawPath, "/")
		if len(pathParts) != 2 || !strings.EqualFold(pathParts[1], "resolve") {
			return httpx.NotFound("wallet correction task resource not found")
		}
		taskID := strings.TrimSpace(pathParts[0])
		if taskID == "" {
			return httpx.BadRequest("taskId is required", map[string]any{"field": "taskId"})
		}

		var request walletCorrectionTaskResolveRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		resolvedTask, err := walletService.ResolveCorrectionTask(taskID, adminActorFromRequest(r), request.ResolutionNote)
		if err != nil {
			return mapWalletCorrectionTaskError(err)
		}

		var walletEntry *wallet.LedgerEntry
		adjustmentType := strings.ToLower(strings.TrimSpace(request.AdjustmentType))
		if adjustmentType == "credit" || adjustmentType == "debit" {
			if request.AdjustmentCents <= 0 {
				return httpx.BadRequest("adjustmentCents must be greater than zero when adjustmentType is credit or debit", map[string]any{
					"field": "adjustmentCents",
				})
			}
			idempotencyKey := strings.TrimSpace(request.IdempotencyKey)
			if idempotencyKey == "" {
				idempotencyKey = fmt.Sprintf("%s:%d", taskID, time.Now().UTC().UnixNano())
			}
			mutationRequest := wallet.MutationRequest{
				UserID:         resolvedTask.UserID,
				AmountCents:    request.AdjustmentCents,
				IdempotencyKey: idempotencyKey,
				Reason:         fmt.Sprintf("wallet correction task %s", taskID),
			}
			var entry wallet.LedgerEntry
			if adjustmentType == "credit" {
				entry, err = walletService.Credit(mutationRequest)
			} else {
				entry, err = walletService.Debit(mutationRequest)
			}
			if err != nil {
				return mapWalletError(err)
			}
			walletEntry = &entry
		}

		response := map[string]any{
			"task": resolvedTask,
		}
		if walletEntry != nil {
			response["entry"] = walletEntry
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, response)
	}))
}

func parseCorrectionLimit(raw string) int {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return 50
	}
	parsed, err := strconv.Atoi(trimmed)
	if err != nil || parsed <= 0 {
		return 50
	}
	if parsed > 500 {
		return 500
	}
	return parsed
}

func summarizeCorrectionTasks(items []wallet.CorrectionTask) map[string]any {
	summary := map[string]any{
		"total":              len(items),
		"open":               0,
		"resolved":           0,
		"negativeBalance":    0,
		"ledgerDrift":        0,
		"manualReview":       0,
		"suggestedAdjustSum": int64(0),
	}

	for _, item := range items {
		switch strings.ToLower(strings.TrimSpace(item.Status)) {
		case "resolved":
			summary["resolved"] = summary["resolved"].(int) + 1
		default:
			summary["open"] = summary["open"].(int) + 1
		}
		switch strings.ToLower(strings.TrimSpace(item.Type)) {
		case "negative_balance":
			summary["negativeBalance"] = summary["negativeBalance"].(int) + 1
		case "ledger_drift":
			summary["ledgerDrift"] = summary["ledgerDrift"].(int) + 1
		case "manual_review":
			summary["manualReview"] = summary["manualReview"].(int) + 1
		}
		summary["suggestedAdjustSum"] = summary["suggestedAdjustSum"].(int64) + item.SuggestedAdjustmentCents
	}
	return summary
}

func mapWalletCorrectionTaskError(err error) error {
	if errors.Is(err, wallet.ErrCorrectionTaskNotFound) {
		return httpx.NotFound("wallet correction task not found")
	}
	if errors.Is(err, wallet.ErrInvalidMutationRequest) {
		return httpx.BadRequest("invalid wallet correction task request", nil)
	}
	return httpx.Internal("wallet correction task operation failed", err)
}
