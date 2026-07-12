package store

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

// Admin catalogue validation. The pack name and badge render on the launch
// store surface, so they must satisfy the same copy boundary as every other
// operator-entered launch string; numeric fields must satisfy the schema
// CHECKs before hitting Postgres so admins get a 400, not a 500.

var packIDPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)

// ErrPackConfigInvalid wraps all catalogue validation failures.
var ErrPackConfigInvalid = errors.New("pack configuration invalid")

// LaunchCopyChecker matches compliance.HasLaunchProhibitedCopy's shape; the
// HTTP layer injects the real predicate so this package stays decoupled.
type LaunchCopyChecker func(text string) bool

// ValidatePackConfig enforces the catalogue contract (STORE_AND_PAYMENTS.md
// §2) for admin create/update. copyCheck may be nil (dev/harness).
func ValidatePackConfig(pack PointPack, copyCheck LaunchCopyChecker) error {
	fail := func(field, msg string) error {
		return fmt.Errorf("%w: %s %s", ErrPackConfigInvalid, field, msg)
	}
	if !packIDPattern.MatchString(pack.ID) {
		return fail("id", "must be a lowercase slug (a-z, 0-9, -, _; max 64 chars)")
	}
	name := strings.TrimSpace(pack.Name)
	if name == "" || len(name) > 80 {
		return fail("name", "is required (max 80 chars)")
	}
	if pack.PriceUsdCents <= 0 {
		return fail("priceUsdCents", "must be a positive integer")
	}
	if pack.BasePoints <= 0 {
		return fail("basePoints", "must be a positive integer")
	}
	if pack.BonusPoints < 0 {
		return fail("bonusPoints", "must be zero or a positive integer")
	}
	if len(pack.Badge) > 40 {
		return fail("badge", "max 40 chars")
	}
	if pack.PromoStartsAt != nil && pack.PromoEndsAt != nil &&
		!pack.PromoEndsAt.After(*pack.PromoStartsAt) {
		return fail("promoEndsAt", "must be after promoStartsAt")
	}
	if copyCheck != nil {
		if copyCheck(name) {
			return fail("name", "contains launch-prohibited wording")
		}
		if pack.Badge != "" && copyCheck(pack.Badge) {
			return fail("badge", "contains launch-prohibited wording")
		}
	}
	return nil
}
