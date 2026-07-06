package httpx

import (
	"errors"
	"fmt"
	"net/http"
)

const (
	CodeBadRequest       = "bad_request"
	CodeConflict         = "conflict"
	CodeUnauthorized     = "unauthorized"
	CodeForbidden        = "forbidden"
	CodeNotFound         = "not_found"
	CodeMethodNotAllowed = "method_not_allowed"
	CodeTooManyRequests  = "too_many_requests"
	CodeInternalError    = "internal_error"
)

type AppError struct {
	Status  int
	Code    string
	Message string
	Details any
	Cause   error
}

func (e *AppError) Error() string {
	if e == nil {
		return ""
	}

	if e.Cause == nil {
		return fmt.Sprintf("%s: %s", e.Code, e.Message)
	}

	return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.Cause)
}

func (e *AppError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Cause
}

func NewError(status int, code string, message string, details any, cause error) *AppError {
	return &AppError{
		Status:  status,
		Code:    code,
		Message: message,
		Details: details,
		Cause:   cause,
	}
}

func BadRequest(message string, details any) *AppError {
	return NewError(http.StatusBadRequest, CodeBadRequest, message, details, nil)
}

func Conflict(message string, details any) *AppError {
	return NewError(http.StatusConflict, CodeConflict, message, details, nil)
}

func Unauthorized(message string) *AppError {
	return NewError(http.StatusUnauthorized, CodeUnauthorized, message, nil, nil)
}

func Forbidden(message string) *AppError {
	return NewError(http.StatusForbidden, CodeForbidden, message, nil, nil)
}

func NotFound(message string) *AppError {
	return NewError(http.StatusNotFound, CodeNotFound, message, nil, nil)
}

func MethodNotAllowed(method string, allowed ...string) *AppError {
	details := map[string]any{
		"method":  method,
		"allowed": allowed,
	}
	return NewError(
		http.StatusMethodNotAllowed,
		CodeMethodNotAllowed,
		"method is not allowed on this endpoint",
		details,
		nil,
	)
}

func TooManyRequests(message string) *AppError {
	return NewError(http.StatusTooManyRequests, CodeTooManyRequests, message, nil, nil)
}

func Internal(message string, cause error) *AppError {
	return NewError(http.StatusInternalServerError, CodeInternalError, message, nil, cause)
}

func FromError(err error) *AppError {
	if err == nil {
		return nil
	}

	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr
	}

	return Internal("internal server error", err)
}
