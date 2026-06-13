package stella.identity.auth.identityprovider.social.facebook;

import stella.identity.auth.identityprovider.social.StellaSocialIdentityProviderITBase;

public class StellaFacebookIdentityProviderIT extends StellaSocialIdentityProviderITBase {

  private final String facebookClientIdValue = System.getenv().getOrDefault("FACEBOOK_CLIENT_ID", "test-facebook-client");
  private final String facebookClientSecretValue = System.getenv().getOrDefault("FACEBOOK_CLIENT_SECRET",
      "test-facebook-secret");

  StellaFacebookIdentityProviderIT() {
    super(/* realmName = */ "stella-test-facebook",
        /* identityProviderProviderId = */ StellaFacebookIdentityProviderFactory.PROVIDER_ID,
        /* identityProviderAlias = */ "stella-facebook",
        /* keycloakClientId = */ "stella-facebook",
        /* newSocialBrowserFlowAlias = */ "browser facebook");
  }

  @Override
  protected String getSocialProviderClientIdValue() {
    return facebookClientIdValue;
  }

  @Override
  protected String getSocialProviderClientSecretValue() {
    return facebookClientSecretValue;
  }
}
