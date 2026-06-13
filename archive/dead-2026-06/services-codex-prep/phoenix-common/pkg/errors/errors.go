package errors

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// AppError represents a standardized application error with HTTP semantics.
type AppError struct {
	// Code is a machine-readable error code for programmatic handling.
	Code string `json:"code"`
	// Message is a human-readable error message.
	Message string `json:"message"`
	// HTTPStatus is the HTTP status code to return.
	HTTPStatus int `json:"http_status"`
	// Details contains additional error context or field-specific errors.
	Details map[string]interface{} `json:"details,omitempty"`
}

// Error implements the error interface.
func (e *AppError) Error() string {
	return e.Message
}

// NewAppError creates a new AppError with the given code, message, and HTTP status.
func NewAppError(code, message string, httpStatus int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		HTTPStatus: httpStatus,
		Details:    make(map[string]interface{}),
	}
}

// WithDetails adds details to the error.
func (e *AppError) WithDetails(key string, value interface{}) *AppError {
	e.Details[key] = value
	return e
}

// WithError wraps another error as a detail.
func (e *AppError) WithError(key string, err error) *AppError {
	e.Details[key] = err.Error()
	return e
}

// Common application errors

// ErrNotFound is returned when a requested resource is not found.
var ErrNotFound = NewAppError("NOT_FOUND", "resource not found", http.StatusNotFound)

// ErrUnauthorized is returned when authentication is required but missing or invalid.
var ErrUnauthorized = NewAppError("UNAUTHORIZED", "authentication required", http.StatusUnauthorized)

// ErrForbidden is returned when the user does not have permission to access a resource.
var ErrForbidden = NewAppError("FORBIDDEN", "access denied", http.StatusForbidden)

// ErrBadRequest is returned when the request is malformed or invalid.
var ErrBadRequest = NewAppError("BAD_REQUEST", "invalid request", http.StatusBadRequest)

// ErrInternalServer is returned for unexpected server errors.
var ErrInternalServer = NewAppError("INTERNAL_SERVER_ERROR", "an unexpected error occurred", http.StatusInternalServerError)

// ErrConflict is returned when the request conflicts with the current state (e.g., duplicate resource).
var ErrConflict = NewAppError("CONFLICT", "resource already exists", http.StatusConflict)

// ErrUnprocessableEntity is returned when the request is well-formed but contains semantic errors.
var ErrUnprocessableEntity = NewAppError("UNPROCESSABLE_ENTITY", "request contains semantic errors", http.StatusUnprocessableEntity)

// Wallet and Financial Errors

// ErrInsufficientFunds is returned when a wallet doesn't have enough balance.
var ErrInsufficientFunds = NewAppError("INSUFFICIENT_FUNDS", "insufficient balance in wallet", http.StatusBadRequest)

// ErrWithdrawalLimitExceeded is returned when a withdrawal exceeds allowed limits.
var ErrWithdrawalLimitExceeded = NewAppError("WITHDRAWAL_LIMIT_EXCEEDED", "withdrawal limit exceeded", http.StatusBadRequest)

// ErrWalletFrozen is returned when attempting to use a frozen wallet.
var ErrWalletFrozen = NewAppError("WALLET_FROZEN", "wallet is frozen", http.StatusBadRequest)

// Market and Betting Errors

// ErrMarketClosed is returned when attempting to place a bet on a closed market.
var ErrMarketClosed = NewAppError("MARKET_CLOSED", "market is closed for betting", http.StatusBadRequest)

// ErrMarketVoid is returned when a market has been voided.
var ErrMarketVoid = NewAppError("MARKET_VOID", "market has been voided", http.StatusBadRequest)

// ErrOutcomeNotFound is returned when an outcome cannot be found.
var ErrOutcomeNotFound = NewAppError("OUTCOME_NOT_FOUND", "outcome not found", http.StatusNotFound)

// ErrBetLimitExceeded is returned when bet limits are exceeded.
var ErrBetLimitExceeded = NewAppError("BET_LIMIT_EXCEEDED", "bet limit exceeded", http.StatusBadRequest)

// ErrInvalidOdds is returned when provided odds are invalid.
var ErrInvalidOdds = NewAppError("INVALID_ODDS", "invalid odds", http.StatusBadRequest)

// ErrMinimumStakeNotMet is returned when the stake is below the minimum.
var ErrMinimumStakeNotMet = NewAppError("MINIMUM_STAKE_NOT_MET", "stake below minimum", http.StatusBadRequest)

// ErrMaximumStakeExceeded is returned when the stake exceeds the maximum.
var ErrMaximumStakeExceeded = NewAppError("MAXIMUM_STAKE_EXCEEDED", "stake exceeds maximum", http.StatusBadRequest)

// User and KYC Errors

// ErrUserBlocked is returned when a user account is blocked.
var ErrUserBlocked = NewAppError("USER_BLOCKED", "user account is blocked", http.StatusForbidden)

// ErrKYCNotApproved is returned when KYC verification is required but not completed.
var ErrKYCNotApproved = NewAppError("KYC_NOT_APPROVED", "KYC verification required", http.StatusForbidden)

// ErrInvalidEmail is returned when an email address is invalid.
var ErrInvalidEmail = NewAppError("INVALID_EMAIL", "invalid email address", http.StatusBadRequest)

// ErrDuplicateEmail is returned when an email is already registered.
var ErrDuplicateEmail = NewAppError("DUPLICATE_EMAIL", "email already registered", http.StatusConflict)

// ErrorResponse represents the JSON response structure for API errors.
type ErrorResponse struct {
	Error   string                 `json:"error"`
	Message string                 `json:"message"`
	Code    string                 `json:"code"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// WriteErrorResponse writes an error response to the HTTP response writer.
// It marshals the AppError to JSON and writes it with the appropriate status code.
func WriteErrorResponse(w http.ResponseWriter, err *AppError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(err.HTTPStatus)

	response := ErrorResponse{
		Error:   http.StatusText(err.HTTPStatus),
		Message: err.Message,
		Code:    err.Code,
		Details: err.Details,
	}

	if len(err.Details) == 0 {
		response.Details = nil
	}

	json.NewEncoder(w).Encode(response)
}

// WriteError is a convenience function that creates and writes an error response.
func WriteError(w http.ResponseWriter, code, message string, httpStatus int) {
	err := NewAppError(code, message, httpStatus)
	WriteErrorResponse(w, err)
}

// FromError converts a standard error to an AppError.
// If the error is already an AppError, it returns it as-is.
// Otherwise, it returns a generic internal server error.
func FromError(err error) *AppError {
	if appErr, ok := err.(*AppError); ok {
		return appErr
	}

	return ErrInternalServer.WithError("original_error", err)
}

// Wrap wraps an error with additional context.
func Wrap(err error, code, message string, httpStatus int) *AppError {
	if appErr, ok := err.(*AppError); ok {
		appErr.WithError("wrapped_error", fmt.Errorf(message))
		return appErr
	}

	return NewAppError(code, message, httpStatus).WithError("cause", err)
}
