package http

// Multi-factor (TOTP) enrollment + enforcement for the auth service. Replaces
// the former cosmetic in-memory 2FA toggle with a real, DB-backed second
// factor that is checked at login. Secrets live in `auth_mfa` (created by
// ensureUserSchema); when no DB is wired (local/dev/in-memory mode) an
// equivalent in-memory store is used so the same code path is exercised.

import (
	"context"
	"database/sql"
	"log"
	"time"

	"phoenix-revival/platform/transport/httpx"
)

// mfaRecord is a user's TOTP enrollment. ActivatedAt == nil means the secret is
// pending (enrolled but not yet confirmed) and is NOT enforced at login.
type mfaRecord struct {
	Secret      string
	ActivatedAt *time.Time
}

// mfaGet returns the user's enrollment, or (nil, nil) when none exists.
func (a *AuthService) mfaGet(userID string) (*mfaRecord, error) {
	if a.db != nil {
		ctx, cancel := context.WithTimeout(context.Background(), userDBTimeout)
		defer cancel()
		var secret string
		var activated sql.NullTime
		err := a.db.QueryRowContext(ctx, `
SELECT secret, activated_at FROM auth_mfa WHERE user_id = $1`, userID).Scan(&secret, &activated)
		if err == sql.ErrNoRows {
			return nil, nil
		}
		if err != nil {
			return nil, err
		}
		rec := &mfaRecord{Secret: secret}
		if activated.Valid {
			t := activated.Time
			rec.ActivatedAt = &t
		}
		return rec, nil
	}

	a.mu.RLock()
	defer a.mu.RUnlock()
	rec, ok := a.mfaMem[userID]
	if !ok {
		return nil, nil
	}
	// Return a copy so callers can't mutate the stored record.
	cp := *rec
	return &cp, nil
}

// mfaUpsertPending stores a fresh, not-yet-activated secret (overwriting any
// prior pending secret for the same user).
func (a *AuthService) mfaUpsertPending(userID, secret string) error {
	if a.db != nil {
		ctx, cancel := context.WithTimeout(context.Background(), userDBTimeout)
		defer cancel()
		_, err := a.db.ExecContext(ctx, `
INSERT INTO auth_mfa (user_id, secret, activated_at, created_at, updated_at)
VALUES ($1, $2, NULL, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET secret = EXCLUDED.secret, activated_at = NULL, updated_at = NOW()`,
			userID, secret)
		return err
	}

	a.mu.Lock()
	defer a.mu.Unlock()
	a.mfaMem[userID] = &mfaRecord{Secret: secret}
	return nil
}

// mfaMarkActivated flips a pending enrollment to active. Returns sql.ErrNoRows
// if there was nothing pending to activate.
func (a *AuthService) mfaMarkActivated(userID string) error {
	if a.db != nil {
		ctx, cancel := context.WithTimeout(context.Background(), userDBTimeout)
		defer cancel()
		res, err := a.db.ExecContext(ctx, `
UPDATE auth_mfa SET activated_at = NOW(), updated_at = NOW()
WHERE user_id = $1 AND activated_at IS NULL`, userID)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return sql.ErrNoRows
		}
		return nil
	}

	a.mu.Lock()
	defer a.mu.Unlock()
	rec, ok := a.mfaMem[userID]
	if !ok || rec.ActivatedAt != nil {
		return sql.ErrNoRows
	}
	now := time.Now().UTC()
	rec.ActivatedAt = &now
	return nil
}

// mfaDelete removes a user's enrollment entirely.
func (a *AuthService) mfaDelete(userID string) error {
	if a.db != nil {
		ctx, cancel := context.WithTimeout(context.Background(), userDBTimeout)
		defer cancel()
		_, err := a.db.ExecContext(ctx, `DELETE FROM auth_mfa WHERE user_id = $1`, userID)
		return err
	}

	a.mu.Lock()
	defer a.mu.Unlock()
	delete(a.mfaMem, userID)
	return nil
}

// MFABeginEnroll generates and stores a fresh pending secret and returns it
// (plus the otpauth URI) so the user can add it to their authenticator. It
// refuses to overwrite an already-active enrollment — the user must disable
// first — so a hijacked session cannot silently rotate the factor.
func (a *AuthService) MFABeginEnroll(userID, accountName string) (secret, uri string, err error) {
	rec, gErr := a.mfaGet(userID)
	if gErr != nil {
		return "", "", httpx.Internal("failed to read multi-factor state", gErr)
	}
	if rec != nil && rec.ActivatedAt != nil {
		return "", "", httpx.Conflict("multi-factor authentication is already active; disable it before re-enrolling", nil)
	}
	secret, err = generateTOTPSecret()
	if err != nil {
		return "", "", httpx.Internal("failed to generate multi-factor secret", err)
	}
	if err = a.mfaUpsertPending(userID, secret); err != nil {
		return "", "", httpx.Internal("failed to store multi-factor secret", err)
	}
	a.audit.Event("auth.mfa.enroll_begin", map[string]any{"userId": userID})
	return secret, otpauthURI(mfaIssuer(), accountName, secret), nil
}

// MFAActivate confirms a pending enrollment by verifying a code against it.
func (a *AuthService) MFAActivate(userID, code string) error {
	rec, err := a.mfaGet(userID)
	if err != nil {
		return httpx.Internal("failed to read multi-factor state", err)
	}
	if rec == nil {
		return httpx.BadRequest("no pending multi-factor enrollment; call enroll first", nil)
	}
	if rec.ActivatedAt != nil {
		return httpx.Conflict("multi-factor authentication is already active", nil)
	}
	if !totpVerify(rec.Secret, code, time.Now()) {
		a.audit.Event("auth.mfa.activate_failed", map[string]any{"userId": userID})
		return httpx.BadRequest("invalid authentication code", nil)
	}
	if err := a.mfaMarkActivated(userID); err != nil {
		if err == sql.ErrNoRows {
			return httpx.BadRequest("no pending multi-factor enrollment; call enroll first", nil)
		}
		return httpx.Internal("failed to activate multi-factor authentication", err)
	}
	a.audit.Event("auth.mfa.activated", map[string]any{"userId": userID})
	return nil
}

// MFADisable turns off an active enrollment. A valid current code is required so
// that a stolen session alone cannot remove the second factor.
func (a *AuthService) MFADisable(userID, code string) error {
	rec, err := a.mfaGet(userID)
	if err != nil {
		return httpx.Internal("failed to read multi-factor state", err)
	}
	if rec == nil || rec.ActivatedAt == nil {
		return httpx.BadRequest("multi-factor authentication is not active", nil)
	}
	if !totpVerify(rec.Secret, code, time.Now()) {
		a.audit.Event("auth.mfa.disable_failed", map[string]any{"userId": userID})
		return httpx.BadRequest("invalid authentication code", nil)
	}
	if err := a.mfaDelete(userID); err != nil {
		return httpx.Internal("failed to disable multi-factor authentication", err)
	}
	a.audit.Event("auth.mfa.disabled", map[string]any{"userId": userID})
	return nil
}

// mfaStatus reports whether the user is enrolled (has any secret) and whether
// MFA is active (enforced at login).
func (a *AuthService) mfaStatus(userID string) (enrolled, active bool, err error) {
	rec, gErr := a.mfaGet(userID)
	if gErr != nil {
		return false, false, gErr
	}
	if rec == nil {
		return false, false, nil
	}
	return true, rec.ActivatedAt != nil, nil
}

// mfaActiveSecret returns the active TOTP secret for a user, used by the login
// gate. The error is propagated so the caller can FAIL CLOSED: a lookup failure
// must deny login rather than silently skip the second factor.
func (a *AuthService) mfaActiveSecret(userID string) (secret string, active bool, err error) {
	rec, gErr := a.mfaGet(userID)
	if gErr != nil {
		log.Printf("warning: mfa lookup failed for %s: %v", userID, gErr)
		return "", false, gErr
	}
	if rec == nil || rec.ActivatedAt == nil {
		return "", false, nil
	}
	return rec.Secret, true, nil
}
