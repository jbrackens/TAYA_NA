package stella.identity.auth.identityprovider.social.google;

import stella.identity.auth.identityprovider.social.StellaSocialIdentityProviderITBase;

public class StellaGoogleIdentityProviderIT extends StellaSocialIdentityProviderITBase {

  private final String googleClientIdValue = System.getenv().getOrDefault("GOOGLE_CLIENT_ID", "test-google-client");
  private final String googleClientSecretValue = System.getenv().getOrDefault("GOOGLE_CLIENT_SECRET", "test-google-secret");

  StellaGoogleIdentityProviderIT() {
    super(/* realmName = */ "stella-test-google",
        /* identityProviderProviderId = */ StellaGoogleIdentityProviderFactory.PROVIDER_ID,
        /* identityProviderAlias = */ "stella-google",
        /* keycloakClientId = */ "stella-google",
        /* newSocialBrowserFlowAlias = */ "browser google");
  }

  @Override
  protected String getSocialProviderClientIdValue() {
    return googleClientIdValue;
  }

  @Override
  protected String getSocialProviderClientSecretValue() {
    return googleClientSecretValue;
  }
}
