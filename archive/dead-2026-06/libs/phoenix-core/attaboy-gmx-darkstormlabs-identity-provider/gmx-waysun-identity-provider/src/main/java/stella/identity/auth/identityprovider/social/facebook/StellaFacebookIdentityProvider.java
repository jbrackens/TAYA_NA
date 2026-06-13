package stella.identity.auth.identityprovider.social.facebook;

import com.fasterxml.jackson.databind.JsonNode;

import org.keycloak.broker.oidc.mappers.AbstractJsonUserAttributeMapper;
import org.keycloak.broker.provider.BrokeredIdentityContext;
import org.keycloak.events.EventBuilder;
import org.keycloak.models.KeycloakSession;
import org.keycloak.social.facebook.FacebookIdentityProvider;
import org.keycloak.social.facebook.FacebookIdentityProviderConfig;

import stella.identity.auth.identityprovider.social.CommonSocialUsernameAndEmailSetter;

public class StellaFacebookIdentityProvider extends FacebookIdentityProvider implements CommonSocialUsernameAndEmailSetter {

  private static final String USERNAME_PREFIX = "fb";

  public StellaFacebookIdentityProvider(KeycloakSession session, FacebookIdentityProviderConfig config) {
    super(session, config);
  }

  @Override
  public String getUsernamePrefix() {
    return USERNAME_PREFIX;
  }

  /**
   * A modified version of an implementation from FacebookIdentityProvider
   */
  @Override
  protected BrokeredIdentityContext extractIdentityFromProfile(EventBuilder event, JsonNode profile) {
    String id = getJsonProperty(profile, "id");

    BrokeredIdentityContext user = new BrokeredIdentityContext(id);

    String email = getJsonProperty(profile, "email");
    setUsernameAndEmail(user, id, email);

    String firstName = getJsonProperty(profile, "first_name");
    String lastName = getJsonProperty(profile, "last_name");

    if (lastName == null) {
      lastName = "";
    }

    user.setFirstName(firstName);
    user.setLastName(lastName);
    user.setIdpConfig(getConfig());
    user.setIdp(this);

    AbstractJsonUserAttributeMapper.storeUserProfileForMapper(user, profile, getConfig().getAlias());

    return user;
  }
}
