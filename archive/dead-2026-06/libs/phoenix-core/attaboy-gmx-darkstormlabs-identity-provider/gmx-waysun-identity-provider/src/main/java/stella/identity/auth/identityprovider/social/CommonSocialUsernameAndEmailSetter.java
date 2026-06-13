package stella.identity.auth.identityprovider.social;

import org.keycloak.broker.provider.BrokeredIdentityContext;

public interface CommonSocialUsernameAndEmailSetter {
  String SOCIAL_PROVIDER_EMAIL = "social_provider_email";

  String getUsernamePrefix();

  default void setUsernameAndEmail(BrokeredIdentityContext identity, String id, String email) {
    String username = String.format("%s_%s", getUsernamePrefix(), id);
    identity.setUsername(username);
    if (email != null) {
      identity.setUserAttribute(SOCIAL_PROVIDER_EMAIL, email);
    }
  }
}
