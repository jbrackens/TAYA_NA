package stella.identity.auth.identityprovider.social.facebook;

import org.keycloak.broker.provider.AbstractIdentityProviderFactory;
import org.keycloak.broker.social.SocialIdentityProviderFactory;
import org.keycloak.models.IdentityProviderModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.social.facebook.FacebookIdentityProviderConfig;

public class StellaFacebookIdentityProviderFactory extends AbstractIdentityProviderFactory<StellaFacebookIdentityProvider>
    implements
      SocialIdentityProviderFactory<StellaFacebookIdentityProvider> {

  public static final String PROVIDER_ID = "stella-facebook";

  @Override
  public String getName() {
    return "StellaFacebook";
  }

  @Override
  public StellaFacebookIdentityProvider create(KeycloakSession session, IdentityProviderModel model) {
    return new StellaFacebookIdentityProvider(session, new FacebookIdentityProviderConfig(model));
  }

  @Override
  public FacebookIdentityProviderConfig createConfig() {
    return new FacebookIdentityProviderConfig();
  }

  @Override
  public String getId() {
    return PROVIDER_ID;
  }
}
