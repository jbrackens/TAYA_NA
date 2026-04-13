package loyalty

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

// StartAutoSave begins a background goroutine that persists state every interval.
func (s *Service) StartAutoSave(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			s.mu.RLock()
			s.saveToDisk()
			s.mu.RUnlock()
		}
	}()
}

type loyaltySnapshot struct {
	Accounts              map[string]canonicalv1.LoyaltyAccount        `json:"accounts"`
	Ledger                map[string][]canonicalv1.LoyaltyLedgerEntry  `json:"ledger"`
	AccrualByKey          map[string]canonicalv1.LoyaltyLedgerEntry    `json:"accrualByKey"`
	AdjustByKey           map[string]canonicalv1.LoyaltyLedgerEntry    `json:"adjustByKey"`
	ReferralsByID         map[string]canonicalv1.ReferralReward        `json:"referralsByID"`
	ReferralByReferred    map[string]string                            `json:"referralByReferred"`
	ReferralIDsByReferrer map[string][]string                          `json:"referralIDsByReferrer"`
	Tiers                 []canonicalv1.LoyaltyTier                    `json:"tiers"`
	Rules                 []canonicalv1.LoyaltyAccrualRule             `json:"rules"`
	EntrySequence         int64                                        `json:"entrySequence"`
	AccountSequence       int64                                        `json:"accountSequence"`
	ReferralSequence      int64                                        `json:"referralSequence"`
}

// SetStatePath configures file-backed persistence. Call before any mutations.
func (s *Service) SetStatePath(path string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.statePath = path
}

func (s *Service) saveToDisk() {
	if s.statePath == "" {
		return
	}
	snap := loyaltySnapshot{
		Accounts:              s.accounts,
		Ledger:                s.ledger,
		AccrualByKey:          s.accrualByKey,
		AdjustByKey:           s.adjustByKey,
		ReferralsByID:         s.referralsByID,
		ReferralByReferred:    s.referralByReferred,
		ReferralIDsByReferrer: s.referralIDsByReferrer,
		Tiers:                 s.tiers,
		Rules:                 s.rules,
		EntrySequence:         s.entrySequence,
		AccountSequence:       s.accountSequence,
		ReferralSequence:      s.referralSequence,
	}
	data, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		log.Printf("loyalty: failed to marshal snapshot: %v", err)
		return
	}
	dir := filepath.Dir(s.statePath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		log.Printf("loyalty: failed to create state dir: %v", err)
		return
	}
	if err := os.WriteFile(s.statePath, data, 0o644); err != nil {
		log.Printf("loyalty: failed to write snapshot: %v", err)
	}
}

func (s *Service) loadFromDisk() error {
	if s.statePath == "" {
		return nil
	}
	data, err := os.ReadFile(s.statePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	var snap loyaltySnapshot
	if err := json.Unmarshal(data, &snap); err != nil {
		return err
	}
	if snap.Accounts != nil {
		s.accounts = snap.Accounts
	}
	if snap.Ledger != nil {
		s.ledger = snap.Ledger
	}
	if snap.AccrualByKey != nil {
		s.accrualByKey = snap.AccrualByKey
	}
	if snap.AdjustByKey != nil {
		s.adjustByKey = snap.AdjustByKey
	}
	if snap.ReferralsByID != nil {
		s.referralsByID = snap.ReferralsByID
	}
	if snap.ReferralByReferred != nil {
		s.referralByReferred = snap.ReferralByReferred
	}
	if snap.ReferralIDsByReferrer != nil {
		s.referralIDsByReferrer = snap.ReferralIDsByReferrer
	}
	if snap.Tiers != nil {
		s.tiers = snap.Tiers
	}
	if snap.Rules != nil {
		s.rules = snap.Rules
	}
	s.entrySequence = snap.EntrySequence
	s.accountSequence = snap.AccountSequence
	s.referralSequence = snap.ReferralSequence
	log.Printf("loyalty: loaded %d accounts from snapshot", len(s.accounts))
	return nil
}
