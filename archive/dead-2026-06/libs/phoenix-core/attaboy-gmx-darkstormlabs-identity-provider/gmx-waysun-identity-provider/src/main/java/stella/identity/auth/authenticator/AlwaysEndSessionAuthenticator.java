package stella.identity.auth.authenticator;

import org.jboss.logging.Logger;

import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.Authenticator;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.services.managers.AuthenticationManager;

public class AlwaysEndSessionAuthenticator implements Authenticator {

  private static final Logger logger = Logger.getLogger(AlwaysEndSessionAuthenticator.class);

  @Override
  public void authenticate(AuthenticationFlowContext context) {
    KeycloakSession session = context.getSession();

    if (session == null) {
      context.success();
      return;
    }

    AuthenticationManager.AuthResult authResult = AuthenticationManager.authenticateIdentityCookie(session,
        context.getRealm(), true);

    if (authResult == null) {
      context.success();
      return;
    }

    logger.debugf("Calling logout on session %s of user %s", authResult.getSession().getId(), authResult.getUser().getId());
    AuthenticationManager.backchannelLogout(
        session,
        authResult.getSession(),
        false);

    context.success();
  }

  @Override
  public void action(AuthenticationFlowContext context) {}

  @Override
  public boolean requiresUser() {
    return false;
  }

  @Override
  public boolean configuredFor(KeycloakSession session, RealmModel realm, UserModel user) {
    return true;
  }

  @Override
  public void setRequiredActions(KeycloakSession session, RealmModel realm, UserModel user) {}

  @Override
  public void close() {}

}
