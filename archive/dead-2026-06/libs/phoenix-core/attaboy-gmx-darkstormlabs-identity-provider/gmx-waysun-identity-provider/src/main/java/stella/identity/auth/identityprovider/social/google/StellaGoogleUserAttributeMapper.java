package stella.identity.auth.identityprovider.social.google;

import org.keycloak.broker.oidc.mappers.AbstractJsonUserAttributeMapper;

public class StellaGoogleUserAttributeMapper extends AbstractJsonUserAttributeMapper {

  private static final String[] cp = new String[]{
      StellaGoogleIdentityProviderFactory.PROVIDER_ID
  };

  @Override
  public String[] getCompatibleProviders() {
    return cp;
  }

  @Override
  public String getId() {
    return "stella-google-user-attribute-mapper";
  }
}
