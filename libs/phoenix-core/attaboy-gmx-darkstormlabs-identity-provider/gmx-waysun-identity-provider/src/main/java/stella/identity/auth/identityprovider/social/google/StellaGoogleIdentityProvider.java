package stella.identity.auth.identityprovider.social.google;

import java.io.IOException;

import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import com.fasterxml.jackson.databind.JsonNode;

import org.keycloak.OAuthErrorException;
import org.keycloak.broker.oidc.mappers.AbstractJsonUserAttributeMapper;
import org.keycloak.broker.provider.BrokeredIdentityContext;
import org.keycloak.broker.provider.IdentityBrokerException;
import org.keycloak.broker.provider.util.SimpleHttp;
import org.keycloak.events.Details;
import org.keycloak.events.Errors;
import org.keycloak.events.EventBuilder;
import org.keycloak.jose.jws.JWSInput;
import org.keycloak.jose.jws.JWSInputException;
import org.keycloak.models.KeycloakSession;
import org.keycloak.representations.AccessTokenResponse;
import org.keycloak.representations.IDToken;
import org.keycloak.representations.JsonWebToken;
import org.keycloak.services.ErrorResponseException;
import org.keycloak.social.google.GoogleIdentityProvider;
import org.keycloak.social.google.GoogleIdentityProviderConfig;
import org.keycloak.util.JsonSerialization;

import stella.identity.auth.identityprovider.social.CommonSocialUsernameAndEmailSetter;

public class StellaGoogleIdentityProvider extends GoogleIdentityProvider implements CommonSocialUsernameAndEmailSetter {

  private static final String USERNAME_PREFIX = "google";
  private static final MediaType APPLICATION_JWT_TYPE = MediaType.valueOf("application/jwt");

  public StellaGoogleIdentityProvider(KeycloakSession session, GoogleIdentityProviderConfig config) {
    super(session, config);
  }

  @Override
  public String getUsernamePrefix() {
    return USERNAME_PREFIX;
  }

  /**
   * A modified version of an implementation from OIDCIdentityProvider
   */
  @Override
  protected BrokeredIdentityContext extractIdentity(AccessTokenResponse tokenResponse, String accessToken, JsonWebToken idToken)
      throws IOException {
    String id = idToken.getSubject();
    BrokeredIdentityContext identity = new BrokeredIdentityContext(id);
    String name = (String) idToken.getOtherClaims().get(IDToken.NAME);
    String givenName = (String) idToken.getOtherClaims().get(IDToken.GIVEN_NAME);
    String familyName = (String) idToken.getOtherClaims().get(IDToken.FAMILY_NAME);
    String email = (String) idToken.getOtherClaims().get(IDToken.EMAIL);

    if (!getConfig().isDisableUserInfoService()) {
      String userInfoUrl = getUserInfoUrl();
      if (userInfoUrl != null && !userInfoUrl.isEmpty()) {

        if (accessToken != null) {
          SimpleHttp.Response response = getUserInfo(accessToken, session, userInfoUrl);
          String contentType = response.getFirstHeader(HttpHeaders.CONTENT_TYPE);
          MediaType contentMediaType;
          try {
            contentMediaType = MediaType.valueOf(contentType);
          } catch (IllegalArgumentException ex) {
            contentMediaType = null;
          }
          if (contentMediaType == null || contentMediaType.isWildcardSubtype() || contentMediaType.isWildcardType()) {
            throw new RuntimeException(
                "Unsupported content-type [" + contentType + "] in response from [" + userInfoUrl + "].");
          }
          JsonNode userInfo;

          if (MediaType.APPLICATION_JSON_TYPE.isCompatible(contentMediaType)) {
            userInfo = response.asJson();
          } else if (APPLICATION_JWT_TYPE.isCompatible(contentMediaType)) {
            JWSInput jwsInput;

            try {
              jwsInput = new JWSInput(response.asString());
            } catch (JWSInputException cause) {
              throw new RuntimeException("Failed to parse JWT userinfo response", cause);
            }

            if (verify(jwsInput)) {
              userInfo = JsonSerialization.readValue(jwsInput.getContent(), JsonNode.class);
            } else {
              throw new RuntimeException("Failed to verify signature of userinfo response from [" + userInfoUrl + "].");
            }
          } else {
            throw new RuntimeException(
                "Unsupported content-type [" + contentType + "] in response from [" + userInfoUrl + "].");
          }

          id = getJsonProperty(userInfo, "sub");
          name = getJsonProperty(userInfo, "name");
          givenName = getJsonProperty(userInfo, IDToken.GIVEN_NAME);
          familyName = getJsonProperty(userInfo, IDToken.FAMILY_NAME);
          email = getJsonProperty(userInfo, "email");
          AbstractJsonUserAttributeMapper.storeUserProfileForMapper(identity, userInfo, getConfig().getAlias());
        }
      }
    }
    identity.getContextData().put(VALIDATED_ID_TOKEN, idToken);

    identity.setId(id);
    setUsernameAndEmail(identity, id, email);

    if (givenName != null) {
      identity.setFirstName(givenName);
    }

    if (familyName != null) {
      identity.setLastName(familyName);
    }

    if (givenName == null && familyName == null) {
      identity.setName(name);
    }

    identity.setBrokerUserId(getConfig().getAlias() + "." + id);

    if (tokenResponse != null && tokenResponse.getSessionState() != null) {
      identity.setBrokerSessionId(getConfig().getAlias() + "." + tokenResponse.getSessionState());
    }
    if (tokenResponse != null)
      identity.getContextData().put(FEDERATED_ACCESS_TOKEN_RESPONSE, tokenResponse);
    if (tokenResponse != null)
      processAccessTokenResponse(identity, tokenResponse);

    return identity;
  }

  protected SimpleHttp.Response getUserInfo(String accessToken, KeycloakSession session, String userInfoUrl)
      throws IOException {
    return executeRequest(userInfoUrl,
        SimpleHttp.doGet(userInfoUrl, session).header("Authorization", "Bearer " + accessToken));
  }

  /**
   * Copied as is from OIDCIdentityProvider
   */
  private SimpleHttp.Response executeRequest(String url, SimpleHttp request) throws IOException {
    SimpleHttp.Response response = request.asResponse();
    if (response.getStatus() != 200) {
      String msg = "failed to invoke url [" + url + "]";
      try {
        String tmp = response.asString();
        if (tmp != null)
          msg = tmp;

      } catch (IOException e) {

      }
      throw new IdentityBrokerException("Failed to invoke url [" + url + "]: " + msg);
    }
    return response;
  }

  /**
   * A modified version of an implementation from OIDCIdentityProvider
   */
  @Override
  protected BrokeredIdentityContext extractIdentityFromProfile(EventBuilder event, JsonNode userInfo) {
    String id = getJsonProperty(userInfo, "sub");
    if (id == null) {
      event.detail(Details.REASON, "sub claim is null from user info json");
      event.error(Errors.INVALID_TOKEN);
      throw new ErrorResponseException(OAuthErrorException.INVALID_TOKEN, "invalid token", Response.Status.BAD_REQUEST);
    }
    BrokeredIdentityContext identity = new BrokeredIdentityContext(id);

    String name = getJsonProperty(userInfo, "name");
    String givenName = getJsonProperty(userInfo, "given_name");
    String familyName = getJsonProperty(userInfo, "family_name");
    String email = getJsonProperty(userInfo, "email");

    AbstractJsonUserAttributeMapper.storeUserProfileForMapper(identity, userInfo, getConfig().getAlias());

    identity.setId(id);
    setUsernameAndEmail(identity, id, email);

    if (givenName != null) {
      identity.setFirstName(givenName);
    }

    if (familyName != null) {
      identity.setLastName(familyName);
    }

    if (givenName == null && familyName == null) {
      identity.setName(name);
    }

    identity.setBrokerUserId(getConfig().getAlias() + "." + id);

    return identity;
  }
}
