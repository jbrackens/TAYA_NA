package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/lib/pq"
)

const storeDBTimeout = 5 * time.Second

// ResolveOutcome is what a ResolveFunc decided while holding the row lock.
type ResolveOutcome struct {
	// Status is the state to persist when the purchase transitions.
	Status PurchaseStatus
	// FailureReason is stored on failed/canceled transitions.
	FailureReason string
	// AlreadyFinal marks an idempotent replay: the row is not updated (and
	// no wallet ops ran); only the evidence event (if any) is recorded.
	AlreadyFinal bool
	// Event is the append-only evidence row to insert alongside the
	// transition (deduped on ProviderEventID when present).
	Event *PaymentEvent
}

// ResolveFunc runs inside the single fulfillment transaction with the locked
// purchase snapshot. tx is nil for the in-memory repository.
type ResolveFunc func(ctx context.Context, tx *sql.Tx, current Purchase) (ResolveOutcome, error)

// Repository persists packs, purchases, and payment events.
type Repository interface {
	ListPacks(ctx context.Context) ([]PointPack, error)
	GetPack(ctx context.Context, id string) (*PointPack, error)
	// HasCompletedPurchase reports whether the user has any completed
	// purchase (first-purchase eligibility + intro_only packs).
	HasCompletedPurchase(ctx context.Context, userID string) (bool, error)
	InsertPurchase(ctx context.Context, purchase *Purchase) error
	PurchaseByClientKey(ctx context.Context, userID, clientKey string) (*Purchase, error)
	Purchase(ctx context.Context, id string) (*Purchase, error)
	PurchasesByUser(ctx context.Context, userID string, limit int) ([]Purchase, error)
	SetProviderSession(ctx context.Context, purchaseID, providerSessionID string) error
	// ResolvePurchase executes the one-transaction fulfillment/terminal flow
	// (contract §5): lock the row, invoke apply with the locked snapshot and
	// the same tx (so wallet credits commit atomically with the status
	// flip), persist the outcome + evidence event, commit.
	ResolvePurchase(ctx context.Context, purchaseID string, apply ResolveFunc) (*Purchase, error)
	// InsertPaymentEvent records evidence outside a transition (delayed
	// confirmations, rejected webhooks for known purchases).
	InsertPaymentEvent(ctx context.Context, event *PaymentEvent) error
}

// DefaultCatalogue returns the §3 seed catalogue. The SQL path is seeded by
// migration 051; the in-memory repository (tests + DB-less dev) uses this.
func DefaultCatalogue() []PointPack {
	return []PointPack{
		{ID: "starter", Name: "Starter", PriceUsdCents: 500, BasePoints: 500, BonusPoints: 0, DisplayOrder: 1, Active: true, Badge: "Starter"},
		{ID: "player", Name: "Player", PriceUsdCents: 1000, BasePoints: 1000, BonusPoints: 50, DisplayOrder: 2, Active: true},
		{ID: "popular", Name: "Popular", PriceUsdCents: 2500, BasePoints: 2500, BonusPoints: 250, DisplayOrder: 3, Active: true, Badge: "Popular"},
		{ID: "pro", Name: "Pro", PriceUsdCents: 5000, BasePoints: 5000, BonusPoints: 750, DisplayOrder: 4, Active: true, Badge: "Best Value"},
		{ID: "high_roller", Name: "High Roller", PriceUsdCents: 10000, BasePoints: 10000, BonusPoints: 2000, DisplayOrder: 5, Active: true},
	}
}

// --- SQL repository ---

// SQLRepository is the Postgres-backed repository over the migration-051
// tables.
type SQLRepository struct {
	db *sql.DB
}

// NewSQLRepository wraps the shared gateway DB handle.
func NewSQLRepository(db *sql.DB) *SQLRepository {
	return &SQLRepository{db: db}
}

const packColumns = `id, name, price_usd_cents, base_points, bonus_points, display_order, active,
	COALESCE(badge, ''), intro_only, promo_starts_at, promo_ends_at, COALESCE(stripe_price_id, ''), created_at, updated_at`

func scanPack(scanner interface{ Scan(...any) error }) (PointPack, error) {
	var pack PointPack
	var promoStart, promoEnd sql.NullTime
	if err := scanner.Scan(
		&pack.ID, &pack.Name, &pack.PriceUsdCents, &pack.BasePoints, &pack.BonusPoints,
		&pack.DisplayOrder, &pack.Active, &pack.Badge, &pack.IntroOnly,
		&promoStart, &promoEnd, &pack.StripePriceID, &pack.CreatedAt, &pack.UpdatedAt,
	); err != nil {
		return PointPack{}, err
	}
	if promoStart.Valid {
		start := promoStart.Time
		pack.PromoStartsAt = &start
	}
	if promoEnd.Valid {
		end := promoEnd.Time
		pack.PromoEndsAt = &end
	}
	return pack, nil
}

func (r *SQLRepository) ListPacks(ctx context.Context) ([]PointPack, error) {
	ctx, cancel := context.WithTimeout(ctx, storeDBTimeout)
	defer cancel()
	rows, err := r.db.QueryContext(ctx, `
SELECT `+packColumns+`
FROM store_point_packs
ORDER BY display_order, id`)
	if err != nil {
		return nil, fmt.Errorf("store: list packs: %w", err)
	}
	defer rows.Close()
	var packs []PointPack
	for rows.Next() {
		pack, err := scanPack(rows)
		if err != nil {
			return nil, fmt.Errorf("store: scan pack: %w", err)
		}
		packs = append(packs, pack)
	}
	return packs, rows.Err()
}

func (r *SQLRepository) GetPack(ctx context.Context, id string) (*PointPack, error) {
	ctx, cancel := context.WithTimeout(ctx, storeDBTimeout)
	defer cancel()
	pack, err := scanPack(r.db.QueryRowContext(ctx, `
SELECT `+packColumns+`
FROM store_point_packs
WHERE id = $1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("store: get pack: %w", err)
	}
	return &pack, nil
}

func (r *SQLRepository) HasCompletedPurchase(ctx context.Context, userID string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, storeDBTimeout)
	defer cancel()
	var exists bool
	if err := r.db.QueryRowContext(ctx, `
SELECT EXISTS (SELECT 1 FROM store_purchases WHERE user_id = $1 AND status = 'completed')`, userID).Scan(&exists); err != nil {
		return false, fmt.Errorf("store: completed-purchase lookup: %w", err)
	}
	return exists, nil
}

func (r *SQLRepository) InsertPurchase(ctx context.Context, purchase *Purchase) error {
	ctx, cancel := context.WithTimeout(ctx, storeDBTimeout)
	defer cancel()
	err := r.db.QueryRowContext(ctx, `
INSERT INTO store_purchases
	(id, user_id, pack_id, price_usd_cents, base_points, bonus_points, status, provider, provider_session_id, client_idempotency_key)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, ''), $10)
RETURNING created_at, updated_at`,
		purchase.ID, purchase.UserID, purchase.PackID,
		purchase.PriceUsdCents, purchase.BasePoints, purchase.BonusPoints,
		string(purchase.Status), purchase.Provider, purchase.ProviderSessionID,
		purchase.ClientIdempotencyKey,
	).Scan(&purchase.CreatedAt, &purchase.UpdatedAt)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" && strings.Contains(pqErr.Constraint, "client_key") {
			return ErrDuplicateClientKey
		}
		return fmt.Errorf("store: insert purchase: %w", err)
	}
	return nil
}

const purchaseColumns = `id, user_id, pack_id, price_usd_cents, base_points, bonus_points, status,
	provider, COALESCE(provider_session_id, ''), client_idempotency_key, COALESCE(failure_reason, ''),
	created_at, updated_at, completed_at`

func scanPurchase(scanner interface{ Scan(...any) error }) (Purchase, error) {
	var purchase Purchase
	var status string
	var completedAt sql.NullTime
	if err := scanner.Scan(
		&purchase.ID, &purchase.UserID, &purchase.PackID,
		&purchase.PriceUsdCents, &purchase.BasePoints, &purchase.BonusPoints, &status,
		&purchase.Provider, &purchase.ProviderSessionID, &purchase.ClientIdempotencyKey, &purchase.FailureReason,
		&purchase.CreatedAt, &purchase.UpdatedAt, &completedAt,
	); err != nil {
		return Purchase{}, err
	}
	purchase.Status = PurchaseStatus(status)
	if completedAt.Valid {
		done := completedAt.Time
		purchase.CompletedAt = &done
	}
	return purchase, nil
}

func (r *SQLRepository) PurchaseByClientKey(ctx context.Context, userID, clientKey string) (*Purchase, error) {
	ctx, cancel := context.WithTimeout(ctx, storeDBTimeout)
	defer cancel()
	purchase, err := scanPurchase(r.db.QueryRowContext(ctx, `
SELECT `+purchaseColumns+`
FROM store_purchases
WHERE user_id = $1 AND client_idempotency_key = $2`, userID, clientKey))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("store: purchase by client key: %w", err)
	}
	return &purchase, nil
}

func (r *SQLRepository) Purchase(ctx context.Context, id string) (*Purchase, error) {
	ctx, cancel := context.WithTimeout(ctx, storeDBTimeout)
	defer cancel()
	purchase, err := scanPurchase(r.db.QueryRowContext(ctx, `
SELECT `+purchaseColumns+`
FROM store_purchases
WHERE id = $1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("store: get purchase: %w", err)
	}
	return &purchase, nil
}

func (r *SQLRepository) PurchasesByUser(ctx context.Context, userID string, limit int) ([]Purchase, error) {
	if limit <= 0 {
		limit = 50
	}
	ctx, cancel := context.WithTimeout(ctx, storeDBTimeout)
	defer cancel()
	rows, err := r.db.QueryContext(ctx, `
SELECT `+purchaseColumns+`
FROM store_purchases
WHERE user_id = $1
ORDER BY created_at DESC, id DESC
LIMIT $2`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("store: list purchases: %w", err)
	}
	defer rows.Close()
	var purchases []Purchase
	for rows.Next() {
		purchase, err := scanPurchase(rows)
		if err != nil {
			return nil, fmt.Errorf("store: scan purchase: %w", err)
		}
		purchases = append(purchases, purchase)
	}
	return purchases, rows.Err()
}

func (r *SQLRepository) SetProviderSession(ctx context.Context, purchaseID, providerSessionID string) error {
	ctx, cancel := context.WithTimeout(ctx, storeDBTimeout)
	defer cancel()
	if _, err := r.db.ExecContext(ctx, `
UPDATE store_purchases
SET provider_session_id = $2, updated_at = NOW()
WHERE id = $1`, purchaseID, providerSessionID); err != nil {
		return fmt.Errorf("store: set provider session: %w", err)
	}
	return nil
}

// ResolvePurchase is the crown-jewel shape copied from the legacy
// DBPaymentService.HandleWebhook: SELECT ... FOR UPDATE, decide + move
// points under the same lock, flip the status, insert evidence, commit.
func (r *SQLRepository) ResolvePurchase(ctx context.Context, purchaseID string, apply ResolveFunc) (*Purchase, error) {
	ctx, cancel := context.WithTimeout(ctx, storeDBTimeout)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("store: begin resolve tx: %w", err)
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	current, err := scanPurchase(tx.QueryRowContext(ctx, `
SELECT `+purchaseColumns+`
FROM store_purchases
WHERE id = $1 FOR UPDATE`, purchaseID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrPurchaseNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("store: lock purchase: %w", err)
	}

	outcome, err := apply(ctx, tx, current)
	if err != nil {
		return nil, err
	}

	if !outcome.AlreadyFinal {
		if !CanTransition(current.Status, outcome.Status) {
			return nil, fmt.Errorf("%w: %s -> %s", ErrInvalidTransition, current.Status, outcome.Status)
		}
		row := tx.QueryRowContext(ctx, `
UPDATE store_purchases
SET status = $2,
    failure_reason = NULLIF($3, ''),
    completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END,
    updated_at = NOW()
WHERE id = $1
RETURNING `+purchaseColumns, purchaseID, string(outcome.Status), outcome.FailureReason)
		current, err = scanPurchase(row)
		if err != nil {
			return nil, fmt.Errorf("store: flip purchase status: %w", err)
		}
	}

	if outcome.Event != nil {
		if err := insertPaymentEventTx(ctx, tx, outcome.Event); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("store: commit resolve tx: %w", err)
	}
	committed = true
	return &current, nil
}

func (r *SQLRepository) InsertPaymentEvent(ctx context.Context, event *PaymentEvent) error {
	ctx, cancel := context.WithTimeout(ctx, storeDBTimeout)
	defer cancel()
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("store: begin event tx: %w", err)
	}
	if err := insertPaymentEventTx(ctx, tx, event); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

func insertPaymentEventTx(ctx context.Context, tx *sql.Tx, event *PaymentEvent) error {
	if _, err := tx.ExecContext(ctx, `
INSERT INTO store_payment_events (purchase_id, event_type, provider_event_id, signature_valid, payload)
VALUES ($1, $2, NULLIF($3, ''), $4, NULLIF($5, ''))
ON CONFLICT (provider_event_id) WHERE provider_event_id IS NOT NULL DO NOTHING`,
		event.PurchaseID, event.EventType, event.ProviderEventID, event.SignatureValid, event.Payload,
	); err != nil {
		return fmt.Errorf("store: insert payment event: %w", err)
	}
	return nil
}

// --- In-memory repository (tests + DB-less dev) ---

// MemoryRepository is a mutex-guarded in-memory Repository. ResolvePurchase
// passes a nil tx to apply; test wallet fakes ignore it.
type MemoryRepository struct {
	mu        sync.Mutex
	packs     map[string]PointPack
	purchases map[string]*Purchase
	byKey     map[string]string // userID + "\x00" + clientKey -> purchaseID
	events    []PaymentEvent
	eventIDs  map[string]bool
}

// NewMemoryRepository builds the in-memory repository seeded with the given
// packs (typically DefaultCatalogue()).
func NewMemoryRepository(packs ...PointPack) *MemoryRepository {
	repo := &MemoryRepository{
		packs:     make(map[string]PointPack, len(packs)),
		purchases: make(map[string]*Purchase),
		byKey:     make(map[string]string),
		eventIDs:  make(map[string]bool),
	}
	for _, pack := range packs {
		repo.packs[pack.ID] = pack
	}
	return repo
}

func memoryClientKey(userID, clientKey string) string {
	return userID + "\x00" + clientKey
}

func (r *MemoryRepository) ListPacks(context.Context) ([]PointPack, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	packs := make([]PointPack, 0, len(r.packs))
	for _, pack := range r.packs {
		packs = append(packs, pack)
	}
	sort.Slice(packs, func(i, j int) bool {
		if packs[i].DisplayOrder != packs[j].DisplayOrder {
			return packs[i].DisplayOrder < packs[j].DisplayOrder
		}
		return packs[i].ID < packs[j].ID
	})
	return packs, nil
}

func (r *MemoryRepository) GetPack(_ context.Context, id string) (*PointPack, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	pack, ok := r.packs[id]
	if !ok {
		return nil, nil
	}
	return &pack, nil
}

func (r *MemoryRepository) HasCompletedPurchase(_ context.Context, userID string) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, purchase := range r.purchases {
		if purchase.UserID == userID && purchase.Status == StatusCompleted {
			return true, nil
		}
	}
	return false, nil
}

func (r *MemoryRepository) InsertPurchase(_ context.Context, purchase *Purchase) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	key := memoryClientKey(purchase.UserID, purchase.ClientIdempotencyKey)
	if _, exists := r.byKey[key]; exists {
		return ErrDuplicateClientKey
	}
	now := time.Now().UTC()
	purchase.CreatedAt = now
	purchase.UpdatedAt = now
	clone := *purchase
	r.purchases[purchase.ID] = &clone
	r.byKey[key] = purchase.ID
	return nil
}

func (r *MemoryRepository) PurchaseByClientKey(_ context.Context, userID, clientKey string) (*Purchase, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	id, ok := r.byKey[memoryClientKey(userID, clientKey)]
	if !ok {
		return nil, nil
	}
	clone := *r.purchases[id]
	return &clone, nil
}

func (r *MemoryRepository) Purchase(_ context.Context, id string) (*Purchase, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	purchase, ok := r.purchases[id]
	if !ok {
		return nil, nil
	}
	clone := *purchase
	return &clone, nil
}

func (r *MemoryRepository) PurchasesByUser(_ context.Context, userID string, limit int) ([]Purchase, error) {
	if limit <= 0 {
		limit = 50
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	var purchases []Purchase
	for _, purchase := range r.purchases {
		if purchase.UserID == userID {
			purchases = append(purchases, *purchase)
		}
	}
	sort.Slice(purchases, func(i, j int) bool {
		if !purchases[i].CreatedAt.Equal(purchases[j].CreatedAt) {
			return purchases[i].CreatedAt.After(purchases[j].CreatedAt)
		}
		return purchases[i].ID > purchases[j].ID
	})
	if len(purchases) > limit {
		purchases = purchases[:limit]
	}
	return purchases, nil
}

func (r *MemoryRepository) SetProviderSession(_ context.Context, purchaseID, providerSessionID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	purchase, ok := r.purchases[purchaseID]
	if !ok {
		return ErrPurchaseNotFound
	}
	purchase.ProviderSessionID = providerSessionID
	purchase.UpdatedAt = time.Now().UTC()
	return nil
}

func (r *MemoryRepository) ResolvePurchase(ctx context.Context, purchaseID string, apply ResolveFunc) (*Purchase, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	purchase, ok := r.purchases[purchaseID]
	if !ok {
		return nil, ErrPurchaseNotFound
	}

	outcome, err := apply(ctx, nil, *purchase)
	if err != nil {
		return nil, err
	}

	if !outcome.AlreadyFinal {
		if !CanTransition(purchase.Status, outcome.Status) {
			return nil, fmt.Errorf("%w: %s -> %s", ErrInvalidTransition, purchase.Status, outcome.Status)
		}
		now := time.Now().UTC()
		purchase.Status = outcome.Status
		purchase.FailureReason = outcome.FailureReason
		purchase.UpdatedAt = now
		if outcome.Status == StatusCompleted {
			done := now
			purchase.CompletedAt = &done
		}
	}

	if outcome.Event != nil {
		r.recordEventLocked(outcome.Event)
	}
	clone := *purchase
	return &clone, nil
}

func (r *MemoryRepository) InsertPaymentEvent(_ context.Context, event *PaymentEvent) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.recordEventLocked(event)
	return nil
}

func (r *MemoryRepository) recordEventLocked(event *PaymentEvent) {
	if event.ProviderEventID != "" {
		if r.eventIDs[event.ProviderEventID] {
			return
		}
		r.eventIDs[event.ProviderEventID] = true
	}
	stored := *event
	if stored.ReceivedAt.IsZero() {
		stored.ReceivedAt = time.Now().UTC()
	}
	r.events = append(r.events, stored)
}

// Events returns a copy of the recorded evidence rows (test observability).
func (r *MemoryRepository) Events() []PaymentEvent {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]PaymentEvent, len(r.events))
	copy(out, r.events)
	return out
}
