package httpx

import (
	"encoding/json"
	"net/http"
)

type ErrorEnvelope struct {
	Error APIError `json:"error"`
}

type APIError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId,omitempty"`
	Details   any    `json:"details,omitempty"`
}

type AppHandler func(http.ResponseWriter, *http.Request) error

func Handle(handler AppHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := handler(w, r); err != nil {
			WriteError(w, r, err)
		}
	}
}

func WriteJSON(w http.ResponseWriter, status int, payload any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(payload)
}

func WriteError(w http.ResponseWriter, r *http.Request, err error) {
	appErr := FromError(err)
	if appErr == nil {
		appErr = Internal("internal server error", nil)
	}

	response := ErrorEnvelope{
		Error: APIError{
			Code:      appErr.Code,
			Message:   appErr.Message,
			RequestID: RequestIDFromContext(r.Context()),
			Details:   appErr.Details,
		},
	}

	_ = WriteJSON(w, appErr.Status, response)
}
