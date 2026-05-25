package http

import (
	"crypto/sha256"
	"encoding/base64"
	"testing"
)

func newTestAuth() *AuthService {
	return &AuthService{
		usersByUsername: map[string]user{},
		oauthIdentities: map[string]string{},
	}
}

// A provider-verified email may link a social identity to an existing account.
func TestResolveOAuth_VerifiedEmailLinksToExisting(t *testing.T) {
	a := newTestAuth()
	a.usersByUsername["alice@example.com"] = user{ID: "u-1", Username: "alice@example.com", PasswordHash: "x", Role: rolePlayer}

	acc, created, err := resolveOAuthAccount(a, oauthIdentity{Provider: "google", Subject: "g-1", Email: "alice@example.com", EmailVerified: true})
	if err != nil {
		t.Fatal(err)
	}
	if created {
		t.Fatal("expected link to existing account, not creation")
	}
	if acc.ID != "u-1" {
		t.Fatalf("expected link to u-1, got %s", acc.ID)
	}
	if uid, ok, err := a.lookupIdentity("google", "g-1"); err != nil || !ok || uid != "u-1" {
		t.Fatalf("identity not recorded against u-1: %q ok=%v err=%v", uid, ok, err)
	}
}

// The core takeover defense: an UNVERIFIED matching email must NOT link.
func TestResolveOAuth_UnverifiedEmailDoesNotLink(t *testing.T) {
	a := newTestAuth()
	a.usersByUsername["victim@example.com"] = user{ID: "u-victim", Username: "victim@example.com", PasswordHash: "x", Role: rolePlayer}

	acc, created, err := resolveOAuthAccount(a, oauthIdentity{Provider: "discord", Subject: "d-9", Email: "victim@example.com", EmailVerified: false})
	if err != nil {
		t.Fatal(err)
	}
	if acc.ID == "u-victim" {
		t.Fatal("ACCOUNT TAKEOVER: unverified email linked to an existing account")
	}
	if !created || acc.Username != "discord:d-9" {
		t.Fatalf("expected isolated identity account discord:d-9, got %q created=%v", acc.Username, created)
	}
}

// Providers that return no email (X/TikTok/Reddit) get isolated accounts.
func TestResolveOAuth_NoEmailCreatesIsolatedAccount(t *testing.T) {
	a := newTestAuth()
	acc, created, err := resolveOAuthAccount(a, oauthIdentity{Provider: "twitter", Subject: "x-1", Name: "X User"})
	if err != nil {
		t.Fatal(err)
	}
	if !created || acc.Username != "twitter:x-1" {
		t.Fatalf("expected new twitter:x-1 account, got %q created=%v", acc.Username, created)
	}
}

// The same (provider, subject) always resolves to the same account.
func TestResolveOAuth_IdempotentSameIdentity(t *testing.T) {
	a := newTestAuth()
	acc1, c1, err := resolveOAuthAccount(a, oauthIdentity{Provider: "reddit", Subject: "r-1"})
	if err != nil {
		t.Fatal(err)
	}
	acc2, c2, err := resolveOAuthAccount(a, oauthIdentity{Provider: "reddit", Subject: "r-1"})
	if err != nil {
		t.Fatal(err)
	}
	if !c1 || c2 {
		t.Fatalf("expected first create then reuse, got c1=%v c2=%v", c1, c2)
	}
	if acc1.ID != acc2.ID {
		t.Fatalf("same identity mapped to different accounts: %s vs %s", acc1.ID, acc2.ID)
	}
}

// Two providers with the same VERIFIED email merge; a third with no email
// must NOT be pulled into that account.
func TestResolveOAuth_CrossProviderVerifiedMergesButNoEmailStaysIsolated(t *testing.T) {
	a := newTestAuth()
	g, gc, err := resolveOAuthAccount(a, oauthIdentity{Provider: "google", Subject: "g-1", Email: "bob@example.com", EmailVerified: true})
	if err != nil {
		t.Fatal(err)
	}
	f, fc, err := resolveOAuthAccount(a, oauthIdentity{Provider: "facebook", Subject: "f-2", Email: "bob@example.com", EmailVerified: true})
	if err != nil {
		t.Fatal(err)
	}
	if !gc || fc {
		t.Fatalf("expected google create + facebook link, got gc=%v fc=%v", gc, fc)
	}
	if g.ID != f.ID {
		t.Fatal("verified same-email providers should merge to one account")
	}
	tk, tc, err := resolveOAuthAccount(a, oauthIdentity{Provider: "tiktok", Subject: "tk-3"})
	if err != nil {
		t.Fatal(err)
	}
	if !tc || tk.ID == g.ID {
		t.Fatal("no-email provider must not merge into the email account")
	}
}

func TestBuildSocialProviders_ConfigInvariants(t *testing.T) {
	provs := map[string]*socialProvider{}
	for _, p := range buildSocialProviders() {
		provs[p.name] = p
	}
	for _, name := range []string{"google", "facebook", "discord", "twitter", "tiktok", "reddit"} {
		if provs[name] == nil {
			t.Fatalf("missing provider %s", name)
		}
		if provs[name].parseUserInfo == nil {
			t.Fatalf("provider %s has no userinfo parser", name)
		}
	}
	if provs["tiktok"].clientParam != "client_key" {
		t.Fatal("TikTok must send client_key, not client_id")
	}
	if !provs["twitter"].usesPKCE {
		t.Fatal("X/Twitter must use PKCE")
	}
	if !provs["reddit"].basicAuth || provs["reddit"].clientIDInBody {
		t.Fatal("Reddit must authenticate via HTTP Basic, not client id in body")
	}
}

// Defense for the synthetic-username pre-hijack: a user must not be able to
// register a "<provider>:<subject>" username and have a later social login adopt it.
func TestRegister_RejectsReservedColonUsername(t *testing.T) {
	a := newTestAuth()
	if _, err := a.Register("twitter:1234567890", "Sup3rSecretPw!", ""); err == nil {
		t.Fatal("Register must reject usernames containing ':' (reserved for isolated social accounts)")
	}
}

// Facebook exposes no email_verified claim, so on a money platform its email
// must not drive auto-linking.
func TestParseUserInfo_FacebookEmailNotAutoVerified(t *testing.T) {
	p := facebookProvider()
	id, err := p.parseUserInfo([]byte(`{"id":"42","name":"Fb User","email":"x@y.com"}`))
	if err != nil {
		t.Fatal(err)
	}
	if id.EmailVerified {
		t.Fatal("Facebook email must not be treated as verified")
	}
	if id.Subject != "42" || id.Email != "x@y.com" {
		t.Fatalf("unexpected parse: %+v", id)
	}
}

func TestParseUserInfo_DiscordRespectsVerifiedFlag(t *testing.T) {
	p := discordProvider()
	id, err := p.parseUserInfo([]byte(`{"id":"123","username":"u","global_name":"G","email":"a@b.com","verified":true}`))
	if err != nil {
		t.Fatal(err)
	}
	if id.Subject != "123" || id.Email != "a@b.com" || !id.EmailVerified || id.Name != "G" {
		t.Fatalf("unexpected parse: %+v", id)
	}
	id2, err := p.parseUserInfo([]byte(`{"id":"123","email":"a@b.com","verified":false}`))
	if err != nil {
		t.Fatal(err)
	}
	if id2.EmailVerified {
		t.Fatal("must not treat an unverified Discord email as verified")
	}
}

func TestNewPKCE_ChallengeIsS256OfVerifier(t *testing.T) {
	v, c, err := newPKCE()
	if err != nil {
		t.Fatal(err)
	}
	if v == "" || c == "" || v == c {
		t.Fatalf("degenerate pkce: verifier=%q challenge=%q", v, c)
	}
	sum := sha256.Sum256([]byte(v))
	if want := base64.RawURLEncoding.EncodeToString(sum[:]); c != want {
		t.Fatalf("challenge is not S256(verifier): got %s want %s", c, want)
	}
}
