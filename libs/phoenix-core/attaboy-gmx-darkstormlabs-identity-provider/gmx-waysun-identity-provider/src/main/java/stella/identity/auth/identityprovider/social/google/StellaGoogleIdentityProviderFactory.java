package stella.identity.auth.identityprovider.social.google;

import org.keycloak.broker.provider.AbstractIdentityProviderFactory;
import org.keycloak.broker.social.SocialIdentityProviderFactory;
import org.keycloak.models.IdentityProviderModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.social.google.GoogleIdentityProviderConfig;

public class StellaGoogleIdentityProviderFactory extends AbstractIdentityProviderFactory<StellaGoogleIdentityProvider>
    implements
      SocialIdentityProviderFactory<StellaGoogleIdentityProvider> {

  public static final String PROVIDER_ID = "stella-google";

  @Override
  public String getName() {
    return "StellaGoogle";
  }

  @Override
  public StellaGoogleIdentityProvider create(KeycloakSession session, IdentityProviderModel model) {
    return new StellaGoogleIdentityProvider(session, new GoogleIdentityProviderConfig(model));
  }

  @Override
  public GoogleIdentityProviderConfig createConfig() {
    return new GoogleIdentityProviderConfig();
  }

  @Override
  public String getId() {
    return PROVIDER_ID;
  }
}
