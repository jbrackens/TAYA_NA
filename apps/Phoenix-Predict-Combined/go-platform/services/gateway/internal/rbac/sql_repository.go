package rbac

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/lib/pq"
)

// SQLRepository implements Repository backed by PostgreSQL (migration 027).
type SQLRepository struct {
	db *sql.DB
}

// NewSQLRepository creates a new PostgreSQL-backed RBAC repository.
func NewSQLRepository(db *sql.DB) *SQLRepository {
	return &SQLRepository{db: db}
}

func (r *SQLRepository) ListUsersWithRoles(ctx context.Context) ([]UserWithRoles, error) {
	// json_agg keeps this a single round trip (no N+1). The FILTER drops the
	// NULL row a LEFT JOIN produces for a user with no roles, leaving '[]'.
	const q = `
		SELECT u.id, u.email, u.name, u.status, u.created_at, u.updated_at,
		       COALESCE(
		           json_agg(json_build_object('id', r.id, 'name', r.name) ORDER BY r.name)
		           FILTER (WHERE r.id IS NOT NULL),
		           '[]'
		       ) AS roles
		  FROM admin_users u
		  LEFT JOIN user_roles ur ON ur.user_id = u.id
		  LEFT JOIN roles r ON r.id = ur.role_id
		 GROUP BY u.id
		 ORDER BY u.created_at`
	rows, err := r.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []UserWithRoles{}
	for rows.Next() {
		var u UserWithRoles
		var rolesJSON []byte
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Status, &u.CreatedAt, &u.UpdatedAt, &rolesJSON); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(rolesJSON, &u.Roles); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (r *SQLRepository) GetUserByID(ctx context.Context, id string) (*User, error) {
	// id::text comparison so a non-UUID path param resolves to "not found"
	// rather than a Postgres "invalid input syntax for type uuid" error.
	return r.scanUser(ctx, `WHERE u.id::text = $1`, id)
}

func (r *SQLRepository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	return r.scanUser(ctx, `WHERE lower(u.email) = lower($1)`, email)
}

func (r *SQLRepository) scanUser(ctx context.Context, where, arg string) (*User, error) {
	q := `SELECT u.id, u.email, u.name, u.status, u.created_at, u.updated_at FROM admin_users u ` + where
	var u User
	err := r.db.QueryRowContext(ctx, q, arg).
		Scan(&u.ID, &u.Email, &u.Name, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *SQLRepository) CreateUser(ctx context.Context, u *User, passwordHash string, roleIDs []string, grantedBy string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	err = tx.QueryRowContext(ctx,
		`INSERT INTO admin_users (email, name, password_hash, status)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, created_at, updated_at`,
		u.Email, u.Name, passwordHash, u.Status,
	).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicateEmail
		}
		return err
	}

	for _, roleID := range roleIDs {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO user_roles (user_id, role_id, granted_by)
			 VALUES ($1, $2, $3) ON CONFLICT (user_id, role_id) DO NOTHING`,
			u.ID, roleID, grantedBy,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *SQLRepository) SetUserRoles(ctx context.Context, userID string, roleIDs []string, grantedBy string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Lock the target user row for the transaction so the role replacement can't
	// race a concurrent change, and fail closed if the user vanished (the
	// service's pre-check happens outside this tx).
	var lockedID string
	switch err := tx.QueryRowContext(ctx,
		`SELECT id FROM admin_users WHERE id::text = $1 FOR UPDATE`, userID).Scan(&lockedID); {
	case errors.Is(err, sql.ErrNoRows):
		return ErrUserNotFound
	case err != nil:
		return err
	}

	// Last-super-admin guard: refuse to drop the full-access role from the only
	// active account that still holds it (would lock everyone out of Access
	// Control). Only enforced when this change actually removes it.
	keepsSuperAdmin := false
	for _, roleID := range roleIDs {
		if roleID == SystemFullAccessRoleID {
			keepsSuperAdmin = true
			break
		}
	}
	if !keepsSuperAdmin {
		var hadSuperAdmin bool
		if err := tx.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id::text = $1 AND role_id = $2)`,
			userID, SystemFullAccessRoleID,
		).Scan(&hadSuperAdmin); err != nil {
			return err
		}
		if hadSuperAdmin {
			// Serialize all super-admin removals so the count below is reliable
			// even under concurrent edits to different users.
			if _, err := tx.ExecContext(ctx,
				`SELECT 1 FROM roles WHERE id = $1 FOR UPDATE`, SystemFullAccessRoleID); err != nil {
				return err
			}
			var others int
			if err := tx.QueryRowContext(ctx,
				`SELECT count(*) FROM user_roles ur
				   JOIN admin_users u ON u.id = ur.user_id
				  WHERE ur.role_id = $1 AND u.status = 'active' AND ur.user_id::text <> $2`,
				SystemFullAccessRoleID, userID,
			).Scan(&others); err != nil {
				return err
			}
			if others == 0 {
				return ErrLastSuperAdmin
			}
		}
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM user_roles WHERE user_id = $1`, userID); err != nil {
		return err
	}
	for _, roleID := range roleIDs {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO user_roles (user_id, role_id, granted_by) VALUES ($1, $2, $3)`,
			userID, roleID, grantedBy,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *SQLRepository) SetUserStatus(ctx context.Context, userID, status string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var lockedID string
	switch err := tx.QueryRowContext(ctx,
		`SELECT id FROM admin_users WHERE id::text = $1 FOR UPDATE`, userID).Scan(&lockedID); {
	case errors.Is(err, sql.ErrNoRows):
		return ErrUserNotFound
	case err != nil:
		return err
	}

	// Suspending removes the account from the active set — guard the last
	// super-admin just like role removal does.
	if status != string(StatusActive) {
		orphan, err := wouldOrphanSuperAdmin(ctx, tx, userID)
		if err != nil {
			return err
		}
		if orphan {
			return ErrLastSuperAdmin
		}
	}

	if _, err := tx.ExecContext(ctx,
		`UPDATE admin_users SET status = $2, updated_at = now() WHERE id::text = $1`,
		userID, status,
	); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *SQLRepository) DeleteUser(ctx context.Context, userID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var lockedID string
	switch err := tx.QueryRowContext(ctx,
		`SELECT id FROM admin_users WHERE id::text = $1 FOR UPDATE`, userID).Scan(&lockedID); {
	case errors.Is(err, sql.ErrNoRows):
		return ErrUserNotFound
	case err != nil:
		return err
	}

	orphan, err := wouldOrphanSuperAdmin(ctx, tx, userID)
	if err != nil {
		return err
	}
	if orphan {
		return ErrLastSuperAdmin
	}

	// user_roles cascades via the FK ON DELETE CASCADE.
	if _, err := tx.ExecContext(ctx, `DELETE FROM admin_users WHERE id::text = $1`, userID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *SQLRepository) UpdateUserPassword(ctx context.Context, userID, passwordHash string) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE admin_users SET password_hash = $2, updated_at = now() WHERE id::text = $1`,
		userID, passwordHash)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrUserNotFound
	}
	return nil
}

// wouldOrphanSuperAdmin reports whether removing this user from the active set
// (by suspension or deletion) would leave zero active super-admins. It locks the
// super-admin role row so concurrent removals serialize and the count is
// reliable. Returns false when the user isn't currently an active super-admin.
func wouldOrphanSuperAdmin(ctx context.Context, tx *sql.Tx, userID string) (bool, error) {
	if _, err := tx.ExecContext(ctx, `SELECT 1 FROM roles WHERE id = $1 FOR UPDATE`, SystemFullAccessRoleID); err != nil {
		return false, err
	}
	var isActiveSuperAdmin bool
	if err := tx.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM user_roles ur
			  JOIN admin_users u ON u.id = ur.user_id
			 WHERE ur.user_id::text = $1 AND ur.role_id = $2 AND u.status = 'active')`,
		userID, SystemFullAccessRoleID,
	).Scan(&isActiveSuperAdmin); err != nil {
		return false, err
	}
	if !isActiveSuperAdmin {
		return false, nil
	}
	var others int
	if err := tx.QueryRowContext(ctx, `
		SELECT count(*) FROM user_roles ur
		  JOIN admin_users u ON u.id = ur.user_id
		 WHERE ur.role_id = $1 AND u.status = 'active' AND ur.user_id::text <> $2`,
		SystemFullAccessRoleID, userID,
	).Scan(&others); err != nil {
		return false, err
	}
	return others == 0, nil
}

func (r *SQLRepository) ListRolesWithPermissions(ctx context.Context) ([]RoleWithPermissions, error) {
	const q = `
		SELECT r.id, r.name, r.description, r.is_system,
		       COALESCE(
		           json_agg(rp.permission_id ORDER BY rp.permission_id)
		           FILTER (WHERE rp.permission_id IS NOT NULL),
		           '[]'
		       ) AS permission_ids
		  FROM roles r
		  LEFT JOIN role_permissions rp ON rp.role_id = r.id
		 GROUP BY r.id
		 ORDER BY r.name`
	rows, err := r.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []RoleWithPermissions{}
	for rows.Next() {
		var role RoleWithPermissions
		var permsJSON []byte
		if err := rows.Scan(&role.ID, &role.Name, &role.Description, &role.IsSystem, &permsJSON); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(permsJSON, &role.Permissions); err != nil {
			return nil, err
		}
		out = append(out, role)
	}
	return out, rows.Err()
}

func (r *SQLRepository) ListPermissions(ctx context.Context) ([]Permission, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, description, category FROM permissions ORDER BY category, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Permission{}
	for rows.Next() {
		var p Permission
		if err := rows.Scan(&p.ID, &p.Description, &p.Category); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *SQLRepository) CreateRole(ctx context.Context, role Role) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO roles (id, name, description, is_system) VALUES ($1, $2, $3, false)`,
		role.ID, role.Name, role.Description)
	return err
}

func (r *SQLRepository) DeleteRole(ctx context.Context, roleID string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM roles WHERE id = $1`, roleID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrRoleNotFound
	}
	return nil
}

func (r *SQLRepository) SetRolePermissions(ctx context.Context, roleID string, permissionIDs []string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Lock the role row so concurrent permission edits to the same role
	// serialize instead of interleaving their delete+insert.
	var lockedID string
	switch err := tx.QueryRowContext(ctx,
		`SELECT id FROM roles WHERE id = $1 FOR UPDATE`, roleID).Scan(&lockedID); {
	case errors.Is(err, sql.ErrNoRows):
		return ErrRoleNotFound
	case err != nil:
		return err
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM role_permissions WHERE role_id = $1`, roleID); err != nil {
		return err
	}
	for _, permID := range permissionIDs {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`,
			roleID, permID,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *SQLRepository) EffectivePermissions(ctx context.Context, email string) (map[string]struct{}, error) {
	const q = `
		SELECT DISTINCT rp.permission_id
		  FROM admin_users u
		  JOIN user_roles ur ON ur.user_id = u.id
		  JOIN role_permissions rp ON rp.role_id = ur.role_id
		 WHERE lower(u.email) = lower($1) AND u.status = 'active'`
	rows, err := r.db.QueryContext(ctx, q, email)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	perms := map[string]struct{}{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		perms[id] = struct{}{}
	}
	return perms, rows.Err()
}

// isUniqueViolation reports whether err is a Postgres unique-constraint
// violation (SQLSTATE 23505).
func isUniqueViolation(err error) bool {
	var pqErr *pq.Error
	return errors.As(err, &pqErr) && pqErr.Code == "23505"
}
