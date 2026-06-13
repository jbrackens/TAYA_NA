package stella.identity.auth.authenticator;

import java.util.ArrayList;
import java.util.List;

import org.keycloak.Config;
import org.keycloak.authentication.Authenticator;
import org.keycloak.authentication.AuthenticatorFactory;
import org.keycloak.models.AuthenticationExecutionModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;

public class AlwaysEndSessionAuthenticatorFactory implements AuthenticatorFactory {

  public static final String ID = "stella-always-end-session";

  private static final Authenticator AUTHENTICATOR_INSTANCE = new AlwaysEndSessionAuthenticator();
  private static final List<ProviderConfigProperty> configProperties = new ArrayList<>();

  @Override
  public Authenticator create(KeycloakSession keycloakSession) {
    return AUTHENTICATOR_INSTANCE;
  }

  @Override
  public String getDisplayType() {
    return "Stella Always End Session";
  }

  @Override
  public boolean isConfigurable() {
    return false;
  }

  @Override
  public AuthenticationExecutionModel.Requirement[] getRequirementChoices() {
    return new AuthenticationExecutionModel.Requirement[]{AuthenticationExecutionModel.Requirement.REQUIRED,
        AuthenticationExecutionModel.Requirement.ALTERNATIVE, AuthenticationExecutionModel.Requirement.DISABLED};
  }

  @Override
  public boolean isUserSetupAllowed() {
    return false;
  }

  @Override
  public String getHelpText() {
    return "Always end user session to force authentication - useful when KeyCloak is configured as Identity Broker";
  }

  @Override
  public List<ProviderConfigProperty> getConfigProperties() {
    return configProperties;
  }

  @Override
  public String getReferenceCategory() {
    return null;
  }

  @Override
  public void init(Config.Scope scope) {}

  @Override
  public void postInit(KeycloakSessionFactory keycloakSessionFactory) {}

  @Override
  public void close() {}

  @Override
  public String getId() {
    return ID;
  }
}
