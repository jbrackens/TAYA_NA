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
import org.keycloak.models.ClientModel;
import org.keycloak.models.GroupModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;

public class AddUserToClientGroupAuthenticator implements Authenticator {

  public static final String GROUP_NAME_PREFIX = "grp_client__";
  private static final Logger logger = Logger.getLogger(AddUserToClientGroupAuthenticator.class);

  @Override
  public void authenticate(AuthenticationFlowContext context) {
    UserModel user = context.getUser();
    if (user == null) { // requiresUser is set to true so this case shouldn't really happen
      reportUnauthorizedError(context, AuthenticationFlowError.UNKNOWN_USER, "Missing user");
      return;
    }

    KeycloakSession session = context.getSession();
    if (session == null) {
      reportUnauthorizedError(context, AuthenticationFlowError.INVALID_CLIENT_SESSION, "Missing session");
      return;
    }

    ClientModel client = session.getContext().getClient();
    if (client == null) {
      reportUnauthorizedError(context, AuthenticationFlowError.CLIENT_NOT_FOUND, "Missing client");
      return;
    }

    String groupName = GROUP_NAME_PREFIX + client.getId();
    boolean userAlreadyInGroup = containsGroupWithName(user.getGroupsStream(), groupName);
    if (userAlreadyInGroup) {
      logger.tracef("User %s already in group %s in realm %s", user.getId(), groupName, context.getRealm().getId());
      context.success();
    } else {
      Optional<GroupModel> groupOpt = findGroupWithName(context.getRealm().getGroupsStream(), groupName);
      groupOpt.ifPresentOrElse(group -> {
        user.joinGroup(group);
        logger.debugf("User %s added to group %s in realm %s", user.getId(), groupName, context.getRealm().getId());
        context.success();
      },
          () -> {
            Response response = errorResponse(Response.Status.INTERNAL_SERVER_ERROR.getStatusCode(),
                OAuthErrorException.SERVER_ERROR,
                "Client groups misconfigured");
            context.failure(AuthenticationFlowError.INTERNAL_ERROR, response);
          });
    }
  }

  @Override
  public void action(AuthenticationFlowContext context) {}

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

  private void reportUnauthorizedError(AuthenticationFlowContext context, AuthenticationFlowError authFlowError,
      String errorDescription) {
    Response response = errorResponse(Response.Status.UNAUTHORIZED.getStatusCode(), OAuthErrorException.INVALID_REQUEST,
        errorDescription);
    context.failure(authFlowError, response);
  }

  private boolean containsGroupWithName(Stream<GroupModel> groupsStream, String groupName) {
    return groupsStream.anyMatch(group -> groupName.equals(group.getName()));
  }

  private Optional<GroupModel> findGroupWithName(Stream<GroupModel> groupsStream, String groupName) {
    return groupsStream.filter(group -> groupName.equals(group.getName())).findFirst();
  }
}
