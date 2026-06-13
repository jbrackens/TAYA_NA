package stella.identity.auth.authenticator;

import static org.keycloak.authentication.authenticators.client.ClientAuthUtil.errorResponse;

import java.util.Optional;
import java.util.stream.Stream;

import javax.ws.rs.core.Response;

import org.jboss.logging.Logger;

import org.keycloak.OAuthErrorException;
import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.AuthenticationFlowError;
import org.keycloak.authentication.Authenticator;
import org.keycloak.models.AuthenticatorConfigModel;
import org.keycloak.models.ClientModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.RoleModel;
import org.keycloak.models.UserModel;

public class RequireClientRoleAuthenticator implements Authenticator {

  private static final Logger logger = Logger.getLogger(RequireClientRoleAuthenticator.class);

  @Override
  public void authenticate(AuthenticationFlowContext context) {
    KeycloakSession session = context.getSession();
    if (session == null) {
      reportAuthError(context, AuthenticationFlowError.INVALID_CLIENT_SESSION, "Missing session");
      return;
    }

    ClientModel client = session.getContext().getClient();
    if (client == null) {
      reportAuthError(context, AuthenticationFlowError.CLIENT_NOT_FOUND, "Missing client");
      return;
    }

    UserModel user = context.getUser();
    if (user == null) {
      reportAuthError(context, AuthenticationFlowError.UNKNOWN_USER, "Missing user");
      return;
    }

    Optional<String> requiredRoleNameOpt = getRequiredRoleName(context);
    if (requiredRoleNameOpt.isEmpty()) {
      logger.errorf("Authenticator doesn't have role configured (it's empty)");
      reportAuthError(context, AuthenticationFlowError.INTERNAL_ERROR, "Authentication misconfigured");
      return;
    }
    String requiredRoleName = requiredRoleNameOpt.get();

    if (!hasRequiredRole(client, user, requiredRoleName)) {
      logger.warnf("User %s doesn't have role %s for client %s", user.getUsername(), requiredRoleName, client.getClientId());
      reportAuthError(context, AuthenticationFlowError.INVALID_USER, "Missing user role");
      return;
    }

    logger.debugf("User %s has role %s for client %s", user.getUsername(), requiredRoleName, client.getClientId());
    context.success();
  }

  @Override
  public void action(AuthenticationFlowContext context) {}

  /**
   * In case of some types of a flow ensures that we fail fast when user is null
   */
  @Override
  public boolean requiresUser() {
    return true;
  }

  @Override
  public boolean configuredFor(KeycloakSession session, RealmModel realm, UserModel user) {
    return true;
  }

  @Override
  public void setRequiredActions(KeycloakSession session, RealmModel realm, UserModel user) {}

  @Override
  public void close() {}

  private boolean hasRequiredRole(ClientModel client, UserModel user, String requiredRoleName) {
    return isClientRoleAssignedToUser(client, user, requiredRoleName) ||
        isClientRoleAssignedToOneOfGroupsOfUser(client, user, requiredRoleName);
  }

  private boolean isClientRoleAssignedToUser(ClientModel client, UserModel user, String requiredRoleName) {
    return checkHasRole(user.getClientRoleMappingsStream(client), requiredRoleName);
  }

  private boolean isClientRoleAssignedToOneOfGroupsOfUser(ClientModel client, UserModel user, String requiredRoleName) {
    return user.getGroupsStream().anyMatch(
        group -> checkHasRole(group.getClientRoleMappingsStream(client), requiredRoleName));
  }

  private boolean checkHasRole(Stream<RoleModel> group, String requiredRoleName) {
    return group.anyMatch(role -> requiredRoleName.equalsIgnoreCase(role.getName()));
  }

  private Optional<String> getRequiredRoleName(AuthenticationFlowContext context) {
    AuthenticatorConfigModel authConfigModel = context.getAuthenticatorConfig();
    return authConfigModel == null
        // A case when the authenticator was created but not modified.
        ? Optional.of(RequireClientRoleAuthenticatorFactory.DEFAULT_ROLE)
        : authConfigModel.getConfig().containsKey(RequireClientRoleAuthenticatorFactory.CLIENT_ROLE_NAME)
            // A case when the authenticator was created and a role was set in its config.
            ? Optional.of(authConfigModel.getConfig().get(RequireClientRoleAuthenticatorFactory.CLIENT_ROLE_NAME).trim())
            // A case when the authenticator config was changed and there's an empty/blank value set as a role name.
            // It looks there's no obvious way to add a custom validation to check this when modifying configuration.
            : Optional.empty();
  }

  private void reportAuthError(AuthenticationFlowContext context, AuthenticationFlowError authFlowError,
      String errorDescription) {
    Response response = errorResponse(Response.Status.UNAUTHORIZED.getStatusCode(), OAuthErrorException.INVALID_REQUEST,
        errorDescription);
    context.failure(authFlowError, response);
  }
}
