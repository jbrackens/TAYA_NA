package rbac

import (
	"context"
	"errors"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

// unconstrained is the dev-bypass actor used by tests that exercise core logic
// (validation, dedupe) rather than the privilege-subset enforcement.
var unconstrained = Actor{Unconstrained: true}

// fakeRepo is an in-memory Repository for service-level tests.
type fakeRepo struct {
	users     map[string]*User    // id -> user
	hashes    map[string]string   // id -> password hash
	userRoles map[string][]string // id -> role ids
	roles     []RoleWithPermissions
	perms     []Permission
	nextID    int
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		users:     map[string]*User{},
		hashes:    map[string]string{},
		userRoles: map[string][]string{},
		roles: []RoleWithPermissions{
			// super-admin holds every permission (true full-access role).
			{Role: Role{ID: "super-admin", Name: "Super Admin", IsSystem: true}, Permissions: []string{"users:read", "users:write", "finances:view"}},
			{Role: Role{ID: "customer-support", Name: "Customer Support", IsSystem: true}, Permissions: []string{"users:read"}},
		},
		perms: []Permission{
			{ID: "users:read", Category: "users"},
			{ID: "users:write", Category: "users"},
			{ID: "finances:view", Category: "finance"},
		},
	}
}

func (f *fakeRepo) ListUsersWithRoles(ctx context.Context) ([]UserWithRoles, error) {
	out := []UserWithRoles{}
	for id, u := range f.users {
		out = append(out, UserWithRoles{User: *u, Roles: f.refsFor(id)})
	}
	return out, nil
}

func (f *fakeRepo) refsFor(id string) []RoleRef {
	refs := []RoleRef{}
	for _, rid := range f.userRoles[id] {
		for _, r := range f.roles {
			if r.ID == rid {
				refs = append(refs, RoleRef{ID: r.ID, Name: r.Name})
			}
		}
	}
	return refs
}

func (f *fakeRepo) GetUserByID(ctx context.Context, id string) (*User, error) {
	if u, ok := f.users[id]; ok {
		return u, nil
	}
	return nil, nil
}

func (f *fakeRepo) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	for _, u := range f.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, nil
}

func (f *fakeRepo) CreateUser(ctx context.Context, u *User, passwordHash string, roleIDs []string, grantedBy string) error {
	for _, ex := range f.users {
		if ex.Email == u.Email {
			return ErrDuplicateEmail
		}
	}
	f.nextID++
	u.ID = "u" + string(rune('0'+f.nextID))
	f.users[u.ID] = u
	f.hashes[u.ID] = passwordHash
	f.userRoles[u.ID] = append([]string{}, roleIDs...)
	return nil
}

func (f *fakeRepo) SetUserRoles(ctx context.Context, userID string, roleIDs []string, grantedBy string) error {
	if _, ok := f.users[userID]; !ok {
		return ErrUserNotFound
	}
	f.userRoles[userID] = append([]string{}, roleIDs...)
	return nil
}

func (f *fakeRepo) SetUserStatus(ctx context.Context, userID, status string) error {
	u, ok := f.users[userID]
	if !ok {
		return ErrUserNotFound
	}
	u.Status = UserStatus(status)
	return nil
}

func (f *fakeRepo) DeleteUser(ctx context.Context, userID string) error {
	if _, ok := f.users[userID]; !ok {
		return ErrUserNotFound
	}
	delete(f.users, userID)
	delete(f.hashes, userID)
	delete(f.userRoles, userID)
	return nil
}

func (f *fakeRepo) UpdateUserPassword(ctx context.Context, userID, passwordHash string) error {
	if _, ok := f.users[userID]; !ok {
		return ErrUserNotFound
	}
	f.hashes[userID] = passwordHash
	return nil
}

func (f *fakeRepo) ListRolesWithPermissions(ctx context.Context) ([]RoleWithPermissions, error) {
	return f.roles, nil
}

func (f *fakeRepo) ListPermissions(ctx context.Context) ([]Permission, error) {
	return f.perms, nil
}

func (f *fakeRepo) SetRolePermissions(ctx context.Context, roleID string, permissionIDs []string) error {
	for i := range f.roles {
		if f.roles[i].ID == roleID {
			f.roles[i].Permissions = append([]string{}, permissionIDs...)
			return nil
		}
	}
	return ErrRoleNotFound
}

func (f *fakeRepo) EffectivePermissions(ctx context.Context, email string) (map[string]struct{}, error) {
	out := map[string]struct{}{}
	for id, u := range f.users {
		if u.Email != email || u.Status != StatusActive {
			continue
		}
		for _, rid := range f.userRoles[id] {
			for _, r := range f.roles {
				if r.ID == rid {
					for _, p := range r.Permissions {
						out[p] = struct{}{}
					}
				}
			}
		}
	}
	return out, nil
}

// seedActor creates a staff user with the given role (via the unconstrained
// path) and returns an Actor bound to its email for constrained-actor tests.
func seedActor(t *testing.T, svc *Service, email, roleID string) Actor {
	t.Helper()
	if _, err := svc.CreateUser(context.Background(), CreateUserInput{
		Name: "Actor", Email: email, Password: "password1", RoleIDs: []string{roleID},
	}, unconstrained); err != nil {
		t.Fatalf("seed actor: %v", err)
	}
	return Actor{Email: email}
}

func TestCreateUser_Validation(t *testing.T) {
	svc := NewService(newFakeRepo())
	cases := []struct {
		name string
		in   CreateUserInput
	}{
		{"empty name", CreateUserInput{Name: "  ", Email: "a@b.co", Password: "password1"}},
		{"bad email", CreateUserInput{Name: "A", Email: "not-an-email", Password: "password1"}},
		{"short password", CreateUserInput{Name: "A", Email: "a@b.co", Password: "short"}},
		{"unknown role", CreateUserInput{Name: "A", Email: "a@b.co", Password: "password1", RoleIDs: []string{"ghost"}}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := svc.CreateUser(context.Background(), tc.in, unconstrained)
			var ve ValidationError
			if !errors.As(err, &ve) {
				t.Fatalf("want ValidationError, got %v", err)
			}
		})
	}
}

func TestCreateUser_Success_HashesAndAssignsRoles(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo)
	got, err := svc.CreateUser(context.Background(), CreateUserInput{
		Name:     "Olivia Ops",
		Email:    "Olivia@Example.com", // mixed case -> normalized
		Password: "temp-password-1",
		RoleIDs:  []string{"customer-support", "customer-support"}, // dup collapses
	}, unconstrained)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Email != "olivia@example.com" {
		t.Errorf("email not normalized: %q", got.Email)
	}
	if len(got.Roles) != 1 || got.Roles[0].ID != "customer-support" {
		t.Errorf("roles not de-duplicated/assigned: %+v", got.Roles)
	}
	if hash := repo.hashes[got.ID]; bcrypt.CompareHashAndPassword([]byte(hash), []byte("temp-password-1")) != nil {
		t.Errorf("stored hash does not verify against the temporary password")
	}
}

func TestCreateUser_DuplicateEmail(t *testing.T) {
	svc := NewService(newFakeRepo())
	in := CreateUserInput{Name: "A", Email: "dupe@b.co", Password: "password1"}
	if _, err := svc.CreateUser(context.Background(), in, unconstrained); err != nil {
		t.Fatalf("first create failed: %v", err)
	}
	_, err := svc.CreateUser(context.Background(), in, unconstrained)
	if !errors.Is(err, ErrDuplicateEmail) {
		t.Fatalf("want ErrDuplicateEmail, got %v", err)
	}
}

func TestSetUserRoles(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo)
	created, _ := svc.CreateUser(context.Background(), CreateUserInput{Name: "A", Email: "a@b.co", Password: "password1"}, unconstrained)

	if _, err := svc.SetUserRoles(context.Background(), "missing", []string{"super-admin"}, unconstrained); !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("want ErrUserNotFound, got %v", err)
	}
	if _, err := svc.SetUserRoles(context.Background(), created.ID, []string{"ghost"}, unconstrained); err == nil {
		t.Fatalf("want validation error for unknown role")
	}
	got, err := svc.SetUserRoles(context.Background(), created.ID, []string{"super-admin"}, unconstrained)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got.Roles) != 1 || got.Roles[0].ID != "super-admin" {
		t.Errorf("roles not replaced: %+v", got.Roles)
	}
}

func TestSetRolePermissions(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo)

	if _, err := svc.SetRolePermissions(context.Background(), "ghost", nil, unconstrained); !errors.Is(err, ErrRoleNotFound) {
		t.Fatalf("want ErrRoleNotFound, got %v", err)
	}
	if _, err := svc.SetRolePermissions(context.Background(), "customer-support", []string{"bogus:perm"}, unconstrained); err == nil {
		t.Fatalf("want validation error for unknown permission")
	}
	got, err := svc.SetRolePermissions(context.Background(), "customer-support",
		[]string{"users:read", "finances:view", "users:read"}, unconstrained) // dup collapses
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got.Permissions) != 2 {
		t.Errorf("want 2 de-duplicated permissions, got %+v", got.Permissions)
	}
}

func TestHasPermission(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo)
	created, _ := svc.CreateUser(context.Background(), CreateUserInput{
		Name: "A", Email: "a@b.co", Password: "password1", RoleIDs: []string{"customer-support"},
	}, unconstrained)

	ok, err := svc.HasPermission(context.Background(), "a@b.co", "users:read")
	if err != nil || !ok {
		t.Fatalf("expected users:read granted via customer-support, ok=%v err=%v", ok, err)
	}
	if ok, _ := svc.HasPermission(context.Background(), "a@b.co", "users:write"); ok {
		t.Errorf("customer-support must NOT have users:write")
	}
	if ok, _ := svc.HasPermission(context.Background(), "", "users:read"); ok {
		t.Errorf("empty email must never have permissions")
	}

	// Suspended users lose all permissions.
	repo.users[created.ID].Status = StatusSuspended
	if ok, _ := svc.HasPermission(context.Background(), "a@b.co", "users:read"); ok {
		t.Errorf("suspended user must not resolve any permissions")
	}
}

// --- Privilege-escalation guards (P1 fixes) ---

func TestCreateUser_ActorCannotAssignRoleBeyondOwnPermissions(t *testing.T) {
	svc := NewService(newFakeRepo())
	actor := seedActor(t, svc, "support-actor@x.co", "customer-support") // holds only users:read

	// Assigning super-admin (which carries users:write) must be refused.
	_, err := svc.CreateUser(context.Background(), CreateUserInput{
		Name: "New", Email: "new1@x.co", Password: "password1", RoleIDs: []string{"super-admin"},
	}, actor)
	if !errors.Is(err, ErrInsufficientPrivilege) {
		t.Fatalf("want ErrInsufficientPrivilege assigning super-admin, got %v", err)
	}

	// Assigning a role whose perms ⊆ the actor's is allowed.
	if _, err := svc.CreateUser(context.Background(), CreateUserInput{
		Name: "New", Email: "new2@x.co", Password: "password1", RoleIDs: []string{"customer-support"},
	}, actor); err != nil {
		t.Fatalf("assigning customer-support should be allowed, got %v", err)
	}
}

func TestSetUserRoles_ActorCannotEscalateToSuperAdmin(t *testing.T) {
	svc := NewService(newFakeRepo())
	actor := seedActor(t, svc, "support-actor@x.co", "customer-support")
	target, _ := svc.CreateUser(context.Background(), CreateUserInput{
		Name: "T", Email: "target@x.co", Password: "password1", RoleIDs: []string{"customer-support"},
	}, unconstrained)

	if _, err := svc.SetUserRoles(context.Background(), target.ID, []string{"super-admin"}, actor); !errors.Is(err, ErrInsufficientPrivilege) {
		t.Fatalf("want ErrInsufficientPrivilege, got %v", err)
	}
}

func TestSetRolePermissions_SuperAdminRoleImmutable(t *testing.T) {
	svc := NewService(newFakeRepo())
	admin := seedActor(t, svc, "admin-actor@x.co", "super-admin") // holds everything

	// Even a full-access actor cannot edit the super-admin role via the API.
	if _, err := svc.SetRolePermissions(context.Background(), "super-admin", []string{"users:read"}, admin); !errors.Is(err, ErrImmutableRole) {
		t.Fatalf("want ErrImmutableRole, got %v", err)
	}
	// The dev bypass may still edit it.
	if _, err := svc.SetRolePermissions(context.Background(), "super-admin", []string{"users:read"}, unconstrained); err != nil {
		t.Fatalf("unconstrained edit of super-admin should be allowed, got %v", err)
	}
}

func TestSetRolePermissions_ActorCannotGrantUnheldPermission(t *testing.T) {
	svc := NewService(newFakeRepo())
	actor := seedActor(t, svc, "support-actor@x.co", "customer-support") // holds only users:read

	// Adding users:write (not held) to a role must be refused.
	if _, err := svc.SetRolePermissions(context.Background(), "customer-support", []string{"users:read", "users:write"}, actor); !errors.Is(err, ErrInsufficientPrivilege) {
		t.Fatalf("want ErrInsufficientPrivilege, got %v", err)
	}
}

func TestSetRolePermissions_SuperAdminActorCanGrantHeldPermissions(t *testing.T) {
	svc := NewService(newFakeRepo())
	admin := seedActor(t, svc, "admin-actor@x.co", "super-admin") // holds everything

	got, err := svc.SetRolePermissions(context.Background(), "customer-support",
		[]string{"users:read", "users:write", "finances:view"}, admin)
	if err != nil {
		t.Fatalf("super-admin actor should grant any held permission, got %v", err)
	}
	if len(got.Permissions) != 3 {
		t.Errorf("want 3 permissions, got %+v", got.Permissions)
	}
}

// --- Staff lifecycle (suspend / delete / reset) ---

func TestSetUserStatus(t *testing.T) {
	svc := NewService(newFakeRepo())
	u, _ := svc.CreateUser(context.Background(), CreateUserInput{Name: "A", Email: "a@b.co", Password: "password1"}, unconstrained)

	if _, err := svc.SetUserStatus(context.Background(), u.ID, "bogus", unconstrained); err == nil {
		t.Fatal("want validation error for bad status")
	}
	if _, err := svc.SetUserStatus(context.Background(), "missing", "suspended", unconstrained); !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("want ErrUserNotFound, got %v", err)
	}
	got, err := svc.SetUserStatus(context.Background(), u.ID, "suspended", unconstrained)
	if err != nil || got.Status != StatusSuspended {
		t.Fatalf("suspend failed: err=%v status=%v", err, got.Status)
	}
}

func TestSuspendAndDelete_SelfGuard(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo)
	actor := seedActor(t, svc, "self@x.co", "customer-support")
	self, _ := repo.GetUserByEmail(context.Background(), "self@x.co")

	if _, err := svc.SetUserStatus(context.Background(), self.ID, "suspended", actor); !errors.Is(err, ErrCannotTargetSelf) {
		t.Fatalf("want ErrCannotTargetSelf on self-suspend, got %v", err)
	}
	if err := svc.DeleteUser(context.Background(), self.ID, actor); !errors.Is(err, ErrCannotTargetSelf) {
		t.Fatalf("want ErrCannotTargetSelf on self-delete, got %v", err)
	}
	// A different actor (unconstrained here) can delete the account.
	if err := svc.DeleteUser(context.Background(), self.ID, unconstrained); err != nil {
		t.Fatalf("delete by other actor failed: %v", err)
	}
}

func TestResetPassword(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo)
	u, _ := svc.CreateUser(context.Background(), CreateUserInput{Name: "A", Email: "a@b.co", Password: "password1"}, unconstrained)

	if err := svc.ResetPassword(context.Background(), u.ID, "short", unconstrained); err == nil {
		t.Fatal("want validation error for short password")
	}
	if err := svc.ResetPassword(context.Background(), u.ID, "new-password-2", unconstrained); err != nil {
		t.Fatalf("reset failed: %v", err)
	}
	if bcrypt.CompareHashAndPassword([]byte(repo.hashes[u.ID]), []byte("new-password-2")) != nil {
		t.Error("password hash was not updated to the new password")
	}
}
