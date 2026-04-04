package stella.identity.auth.identityprovider.social.facebook;

import org.keycloak.broker.oidc.mappers.AbstractJsonUserAttributeMapper;

public class StellaFacebookUserAttributeMapper extends AbstractJsonUserAttributeMapper {

  private static final String[] cp = new String[]{
      StellaFacebookIdentityProviderFactory.PROVIDER_ID
  };

  @Override
  public String[] getCompatibleProviders() {
    return cp;
  }

  @Override
  public String getId() {
    return "stella-facebook-user-attribute-mapper";
  }
}
