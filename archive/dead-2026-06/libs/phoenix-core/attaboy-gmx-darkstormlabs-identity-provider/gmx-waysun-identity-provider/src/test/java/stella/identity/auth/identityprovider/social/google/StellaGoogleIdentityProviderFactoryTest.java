package stella.identity.auth.identityprovider.social.google;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import com.github.javafaker.Faker;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.keycloak.broker.provider.BrokeredIdentityContext;
import org.keycloak.broker.provider.util.SimpleHttp;
import org.keycloak.events.EventBuilder;
import org.keycloak.models.IdentityProviderModel;
import org.keycloak.models.IdentityProviderSyncMode;
import org.keycloak.models.KeycloakSession;
import org.keycloak.representations.AccessTokenResponse;
import org.keycloak.representations.IDToken;
import org.keycloak.representations.JsonWebToken;
import org.keycloak.social.google.GoogleIdentityProviderConfig;

@ExtendWith(MockitoExtension.class)
public class StellaGoogleIdentityProviderFactoryTest {

  private final Faker faker = new Faker();
  private final String id = faker.internet().uuid() + ".apps.googleusercontent.com";
  private final String name = faker.name().username();
  private final String email = faker.internet().emailAddress();
  private final String firstName = faker.name().firstName();
  private final String lastName = faker.name().lastName();

  private final String socialProviderEmailAttribute = "user.attributes.social_provider_email";

  private final String userInfoWithEmailJsonString = String.format(
      "{\"sub\":\"%s\",\"name\":\"%s\",\"email\":\"%s\",\"given_name\":\"%s\",\"family_name\":\"%s\"}",
      id, name, email, firstName, lastName);

  private final String userInfoWithoutEmailJsonString = String.format(
      "{\"sub\":\"%s\",\"name\":\"%s\",\"given_name\":\"%s\",\"family_name\":\"%s\"}",
      id, name, firstName, lastName);

  private final ObjectMapper mapper = new ObjectMapper();
  private final JsonNode userInfoWithEmailJson = mapper.readTree(userInfoWithEmailJsonString);
  private final JsonNode userInfoWithoutEmailJson = mapper.readTree(userInfoWithoutEmailJsonString);

  @Mock
  private KeycloakSession mockSession;

  @Mock
  private EventBuilder mockEventBuilder;

  @Mock
  private SimpleHttp.Response mockGoogleUserInfoResponse;

  public StellaGoogleIdentityProviderFactoryTest() throws JsonProcessingException {}

  class TestStellaGoogleIdentityProvider extends StellaGoogleIdentityProvider {
    private final JsonNode userInfo;

    public TestStellaGoogleIdentityProvider(JsonNode userInfo, KeycloakSession session, GoogleIdentityProviderConfig config) {
      super(session, config);
      this.userInfo = userInfo;
    }

    @Override
    protected SimpleHttp.Response getUserInfo(String accessToken, KeycloakSession session, String userInfoUrl)
        throws IOException {
      when(mockGoogleUserInfoResponse.getFirstHeader(HttpHeaders.CONTENT_TYPE)).thenReturn(MediaType.APPLICATION_JSON);
      when(mockGoogleUserInfoResponse.asJson()).thenReturn(userInfo);
      return mockGoogleUserInfoResponse;
    }
  }

  @Test
  @DisplayName("Test whether extractIdentity returns proper identity when email was specified")
  void testExtractIdentityWithEmail() throws IOException {
    testExtractIdentity(userInfoWithEmailJson, Optional.of(email));
  }

  @Test
  @DisplayName("Test whether extractIdentity returns proper identity when email was not specified")
  void testExtractIdentityWithoutEmail() throws IOException {
    testExtractIdentity(userInfoWithoutEmailJson, Optional.empty());
  }

  @Test
  @DisplayName("Test whether extractIdentityFromProfile returns proper identity when email was specified")
  void testExtractIdentityFromProfileWithEmail() throws JsonProcessingException {
    testExtractIdentityFromProfile(userInfoWithEmailJson, Optional.of(email));
  }

  @Test
  @DisplayName("Test whether extractIdentityFromProfile returns proper identity when email was not specified")
  void testExtractIdentityFromProfileWithoutEmail() throws JsonProcessingException {
    testExtractIdentityFromProfile(userInfoWithoutEmailJson, Optional.empty());
  }

  private void testExtractIdentity(JsonNode userInfo, Optional<String> expectedEmail) throws IOException {
    AccessTokenResponse tokenResponse = null;
    String accessToken = "fake_token";
    JsonWebToken idToken = new JsonWebToken();
    idToken.setSubject(id);
    idToken.setOtherClaims(IDToken.NAME, name);
    idToken.setOtherClaims(IDToken.GIVEN_NAME, firstName);
    idToken.setOtherClaims(IDToken.FAMILY_NAME, lastName);
    expectedEmail.ifPresent(email -> idToken.setOtherClaims(IDToken.EMAIL, email));
    GoogleIdentityProviderConfig config = getTestGoogleIdentityProviderConfig();
    StellaGoogleIdentityProvider provider = new TestStellaGoogleIdentityProvider(userInfo, mockSession, config);
    BrokeredIdentityContext result = provider.extractIdentity(tokenResponse, accessToken, idToken);
    verifyResult(expectedEmail, result);
  }

  private void testExtractIdentityFromProfile(JsonNode userInfo, Optional<String> expectedEmail)
      throws JsonProcessingException {
    GoogleIdentityProviderConfig config = getTestGoogleIdentityProviderConfig();
    StellaGoogleIdentityProvider provider = new StellaGoogleIdentityProvider(mockSession, config);
    BrokeredIdentityContext result = provider.extractIdentityFromProfile(mockEventBuilder, userInfo);
    verifyResult(expectedEmail, result);
  }

  private void verifyResult(Optional<String> expectedEmail, BrokeredIdentityContext response) {
    assertEquals(id, response.getId());
    assertEquals("google_" + id, response.getUsername());
    assertNull(response.getEmail());
    assertEquals(firstName, response.getFirstName());
    assertEquals(lastName, response.getLastName());
    Map<String, Object> contextData = response.getContextData();

    expectedEmail.ifPresentOrElse(
        email -> assertEquals(List.of(email), contextData.get(socialProviderEmailAttribute)),
        () -> assertFalse(contextData.containsKey(socialProviderEmailAttribute),
            String.format("%s should not be set for empty email", socialProviderEmailAttribute)));
    ObjectNode userInfoFromResponse = (ObjectNode) contextData.get("UserInfo");
    assertEquals(TextNode.valueOf(id), userInfoFromResponse.get("sub"));
    assertEquals(TextNode.valueOf(name), userInfoFromResponse.get(IDToken.NAME));

    expectedEmail.ifPresentOrElse(
        email -> assertEquals(TextNode.valueOf(email), userInfoFromResponse.get(IDToken.EMAIL)),
        () -> assertFalse(userInfoFromResponse.has(IDToken.EMAIL),
            String.format("%s should not be set for empty email", IDToken.EMAIL)));
    assertEquals(TextNode.valueOf(firstName), userInfoFromResponse.get(IDToken.GIVEN_NAME));
    assertEquals(TextNode.valueOf(lastName), userInfoFromResponse.get(IDToken.FAMILY_NAME));
  }

  private GoogleIdentityProviderConfig getTestGoogleIdentityProviderConfig() {
    IdentityProviderModel model = new IdentityProviderModel();
    model.setHideOnLogin(true);
    model.setSyncMode(IdentityProviderSyncMode.IMPORT);
    model.setConfig(Map.of(
        "userInfoUrl", "https://openidconnect.googleapis.com/v1/userinfo",
        "acceptsPromptNoneForwardFromClient", "true",
        "clientId", "test-google-client",
        "tokenUrl", "https://oauth2.googleapis.com/token",
        "authorizationUrl", "https://accounts.google.com/o/oauth2/v2/auth",
        "clientSecret", "test-google-secret",
        "defaultScope", "openid profile email"));
    return new GoogleIdentityProviderConfig(model);
  }
}
