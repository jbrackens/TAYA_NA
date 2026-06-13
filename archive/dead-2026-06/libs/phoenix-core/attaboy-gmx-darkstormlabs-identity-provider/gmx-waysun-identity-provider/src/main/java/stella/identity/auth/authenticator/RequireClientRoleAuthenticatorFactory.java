package stella.identity.auth.authenticator;

import java.util.List;

import org.keycloak.Config;
import org.keycloak.authentication.Authenticator;
import org.keycloak.authentication.AuthenticatorFactory;
import org.keycloak.models.AuthenticationExecutionModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;

public class RequireClientRoleAuthenticatorFactory implements AuthenticatorFactory {

  public static final String CLIENT_ROLE_NAME = "clientRoleName";

  /**
   * An agreed, default value covering our main use case for this authenticator.
   * It's a custom role which we're going to create in the clients and assign to some users.
   * Once an instance of this authenticator is created, it's possible to set/edit its configuration
   * and this value is set as a default one.
   */
  public static final String DEFAULT_ROLE = "can_login";

  private static final String ID = "stella-require-client-role";

  private static final Authenticator AUTHENTICATOR_INSTANCE = new RequireClientRoleAuthenticator();

  private static final List<ProviderConfigProperty> configProperties = List.of(
      new ProviderConfigProperty(
          /* name = */ CLIENT_ROLE_NAME,
          /* label = */ "Client role",
          /* helpText = */ "Only users with this client role are able to pass this step",
          /* type = */ ProviderConfigProperty.STRING_TYPE,
          /* defaultValue = */ DEFAULT_ROLE));

  @Override
  public Authenticator create(KeycloakSession keycloakSession) {
    return AUTHENTICATOR_INSTANCE;
  }

  @Override
  public String getDisplayType() {
    return "Stella Require Client Role";
  }

  @Override
  public boolean isConfigurable() {
    return true;
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
    return "A flow is executed only if a user has a given role assigned via a company which the user is using to log in.";
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
