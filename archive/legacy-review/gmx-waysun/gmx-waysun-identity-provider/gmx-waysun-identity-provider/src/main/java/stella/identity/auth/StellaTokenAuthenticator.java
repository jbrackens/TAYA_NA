package stella.identity.auth;

import static org.keycloak.services.managers.AppAuthManager.extractAuthorizationHeaderToken;

import javax.ws.rs.NotFoundException;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.UriInfo;

import org.jboss.logging.Logger;

import org.keycloak.TokenVerifier;
import org.keycloak.common.VerificationException;
import org.keycloak.crypto.SignatureProvider;
import org.keycloak.crypto.SignatureVerifierContext;
import org.keycloak.exceptions.TokenVerificationException;
import org.keycloak.models.*;
import org.keycloak.representations.AccessToken;
import org.keycloak.services.Urls;
import org.keycloak.services.managers.AppAuthManager;
import org.keycloak.services.managers.AuthenticationManager;
import org.keycloak.util.TokenUtil;

import stella.identity.config.ServiceConfig;
import stella.identity.crypt.SecretBoxUtils;
import stella.identity.jwt.JwtExtraField;
import stella.identity.spi.StellaSecretBoxService;

public class StellaTokenAuthenticator {

  private KeycloakSession session;
  private RealmModel realm;
  private UriInfo uriInfo;
  private HttpHeaders headers;
  private String tokenString;
  private final boolean isAccessTokenAllowed;
  private final AppAuthManager.BearerTokenAuthenticator bearerTokenAuthenticator;

  private static final Logger logger = Logger.getLogger(StellaTokenAuthenticator.class);

  public StellaTokenAuthenticator(KeycloakSession session) {
    this.session = session;
    this.isAccessTokenAllowed = ServiceConfig.getConfig().identity_provider.allow_access_token_authorization;
    this.bearerTokenAuthenticator = new AppAuthManager.BearerTokenAuthenticator(session);
  }

  public AuthResult authenticate() throws VerificationException {
    KeycloakContext ctx = session.getContext();
    realm = ctx.getRealm();
    uriInfo = ctx.getUri();
    headers = ctx.getRequestHeaders();
    tokenString = extractAuthorizationHeaderToken(headers);

    try {
      return verifyIdentityToken(session, realm, uriInfo, tokenString);
    } catch (VerificationException ve) {
      if (isAccessTokenAllowed) {
        AccessTokenAuthResult authResult = verifyAccessToken();
        if (authResult != null)
          return authResult;
      }
      throw ve;
    }
  }

  private AccessTokenAuthResult verifyAccessToken() throws VerificationException {
    AuthenticationManager.AuthResult authResult = bearerTokenAuthenticator.authenticate();
    if (authResult != null) {
      AccessToken token = authResult.getToken();
      if (token.getRealmAccess() == null || token.getRealmAccess().getRoles() == null) {
        throw new VerificationException("Access token realm_access.roles is missing");
      }
      return new AccessTokenAuthResult(token);
    }
    return null;
  }

  private AuthResult verifyIdentityToken(KeycloakSession session, RealmModel realm, UriInfo uriInfo,
      String tokenString) throws VerificationException {
    TokenVerifier<StellaToken> verifier = TokenVerifier.create(tokenString, StellaToken.class)
        .withDefaultChecks()
        .realmUrl(Urls.realmIssuer(uriInfo.getBaseUri(), realm.getName()))
        .tokenType(TokenUtil.TOKEN_TYPE_ID);

    String kid = verifier.getHeader().getKeyId();
    String algorithm = verifier.getHeader().getAlgorithm().name();

    SignatureVerifierContext signatureVerifier = session.getProvider(SignatureProvider.class, algorithm).verifier(kid);
    verifier.verifierContext(signatureVerifier);

    verifier.withChecks(new StellaTokenExtraFieldValidator(session.getProvider(StellaSecretBoxService.class)));

    verifier.verify();

    StellaToken token = verifier.getToken();

    ClientModel clientModel = realm.getClientByClientId(token.getIssuedFor());

    if (clientModel == null) {
      throw new NotFoundException("Could not find client for authorization");
    }

    return new StellaAuthResult(token, decryptExtra(token));
  }

  private JwtExtraField decryptExtra(StellaToken token) throws TokenVerificationException {
    try {
      return session.getProvider(StellaSecretBoxService.class).decrypt(token.getExtra());
    } catch (SecretBoxUtils.SecretBoxDecryptionException e) {
      logger.errorv("Extra field decryption error", e.getCause());
      throw new TokenVerificationException(token, e.getCause());
    }
  }

}
