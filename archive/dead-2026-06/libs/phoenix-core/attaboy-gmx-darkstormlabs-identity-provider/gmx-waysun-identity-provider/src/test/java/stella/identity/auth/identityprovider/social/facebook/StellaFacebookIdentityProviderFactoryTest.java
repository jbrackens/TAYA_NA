package stella.identity.auth.identityprovider.social.facebook;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;
import java.util.Map;
import java.util.Optional;

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
import org.keycloak.events.EventBuilder;
import org.keycloak.models.IdentityProviderModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.social.facebook.FacebookIdentityProviderConfig;

@ExtendWith(MockitoExtension.class)
public class StellaFacebookIdentityProviderFactoryTest {

  private final Faker faker = new Faker();
  private final String id = "" + faker.number().randomNumber(/* numberOfDigits= */15, /* strict= */ true);
  private final String name = faker.name().username();
  private final String email = faker.internet().emailAddress();
  private final String firstName = faker.name().firstName();
  private final String lastName = faker.name().lastName();

  private final String emailAttribute = "email";
  private final String socialProviderEmailAttribute = "user.attributes.social_provider_email";

  @Mock
  private KeycloakSession mockSession;

  @Mock
  private EventBuilder mockEventBuilder;

  @Test
  @DisplayName("Test whether extractIdentityFromProfile returns proper identity when email was specified")
  void testExtractIdentityFromProfileWithSpecifiedEmail() throws JsonProcessingException {
    String profileJson = String.format(
        "{\"id\":\"%s\",\"name\":\"%s\",\"email\":\"%s\",\"first_name\":\"%s\",\"last_name\":\"%s\"}",
        id, name, email, firstName, lastName);
    testExtractIdentityFromProfile(profileJson, Optional.of(email));
  }

  @Test
  @DisplayName("Test whether extractIdentityFromProfile returns proper identity when email was not specified")
  void testExtractIdentityFromProfileWithoutSpecifiedEmail() throws JsonProcessingException {
    String profileJson = String.format("{\"id\":\"%s\",\"name\":\"%s\",\"first_name\":\"%s\",\"last_name\":\"%s\"}",
        id, name, firstName, lastName);
    testExtractIdentityFromProfile(profileJson, Optional.empty());
  }

  private void testExtractIdentityFromProfile(String profileJson, Optional<String> expectedEmail)
      throws JsonProcessingException {
    ObjectMapper mapper = new ObjectMapper();
    JsonNode profile = mapper.readTree(profileJson);
    FacebookIdentityProviderConfig config = getTestFacebookIdentityProviderConfig();
    StellaFacebookIdentityProvider provider = new StellaFacebookIdentityProvider(mockSession, config);
    BrokeredIdentityContext result = provider.extractIdentityFromProfile(mockEventBuilder, profile);
    verifyResult(expectedEmail, result);
  }

  private void verifyResult(Optional<String> expectedEmail, BrokeredIdentityContext result) {
    assertEquals(id, result.getId());
    assertEquals("fb_" + id, result.getUsername());
    assertNull(result.getEmail());
    assertEquals(firstName, result.getFirstName());
    assertEquals(lastName, result.getLastName());
    var contextData = result.getContextData();

    expectedEmail.ifPresentOrElse(
        email -> assertEquals(List.of(email), contextData.get(socialProviderEmailAttribute)),
        () -> assertFalse(contextData.containsKey(socialProviderEmailAttribute),
            String.format("%s should not be set for empty email", socialProviderEmailAttribute)));
    var userInfo = (ObjectNode) contextData.get("UserInfo");
    assertEquals(TextNode.valueOf(id), userInfo.get("id"));
    assertEquals(TextNode.valueOf(name), userInfo.get("name"));

    expectedEmail.ifPresentOrElse(
        email -> assertEquals(TextNode.valueOf(email), userInfo.get(emailAttribute)),
        () -> assertFalse(userInfo.has(emailAttribute),
            String.format("%s should not be set for empty email", emailAttribute)));
    assertEquals(TextNode.valueOf(firstName), userInfo.get("first_name"));
    assertEquals(TextNode.valueOf(lastName), userInfo.get("last_name"));
  }

  private FacebookIdentityProviderConfig getTestFacebookIdentityProviderConfig() {
    IdentityProviderModel model = new IdentityProviderModel();
    model.setHideOnLogin(true);
    model.setConfig(Map.of(
        "userInfoUrl", "https://graph.facebook.com/me?fields=id,name,email,first_name,last_name",
        "acceptsPromptNoneForwardFromClient", "true",
        "clientId", "132631191087499",
        "tokenUrl", "https://graph.facebook.com/oauth/access_token"));
    return new FacebookIdentityProviderConfig(model);
  }
}
