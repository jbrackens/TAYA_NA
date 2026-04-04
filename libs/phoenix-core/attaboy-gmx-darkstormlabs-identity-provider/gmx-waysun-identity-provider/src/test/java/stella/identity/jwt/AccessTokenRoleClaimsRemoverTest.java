package stella.identity.jwt;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import org.keycloak.models.*;
import org.keycloak.representations.IDToken;

public class AccessTokenRoleClaimsRemoverTest extends AccessTokenRoleClaimsRemover {

  private static final String REALM_ACCESS_CLAIM = "realm_access";
  private static final String RESOURCE_ACCESS_CLAIM = "resource_access";
  private static final String HIDDEN_VALUE = "value_hidden";

  @Test
  public void testSetClaim() {
    ProtocolMapperModel mappingModel = Mockito.mock(ProtocolMapperModel.class);
    UserSessionModel userSession = Mockito.mock(UserSessionModel.class);
    KeycloakSession keycloakSession = Mockito.mock(KeycloakSession.class);
    ClientSessionContext clientSessionCtx = Mockito.mock(ClientSessionContext.class);
    UserModel user = Mockito.mock(UserModel.class);
    AuthenticatedClientSessionModel clientSessionModel = Mockito.mock(AuthenticatedClientSessionModel.class);
    ClientModel client = Mockito.mock(ClientModel.class);
    RealmModel realm = Mockito.mock(RealmModel.class);

    when(userSession.getUser()).thenReturn(user);
    when(user.getId()).thenReturn("some-user-id");
    when(clientSessionCtx.getClientSession()).thenReturn(clientSessionModel);
    when(clientSessionModel.getClient()).thenReturn(client);
    when(client.getId()).thenReturn("some-client-id");
    when(userSession.getRealm()).thenReturn(realm);
    when(realm.getName()).thenReturn("some-realm-id");

    Map<String, String> expectedOtherClaims = Map.of(REALM_ACCESS_CLAIM, HIDDEN_VALUE, RESOURCE_ACCESS_CLAIM, HIDDEN_VALUE);

    // WHEN: we process token without default roles-related claims
    IDToken token1 = new IDToken();
    setClaim(token1, mappingModel, userSession, keycloakSession, clientSessionCtx);
    // THEN: claims are set to expected value
    assertThat(token1.getOtherClaims(), is(expectedOtherClaims));

    // WHEN: we process token with default roles-related claims populated
    IDToken token2 = new IDToken();
    token2.setOtherClaims(REALM_ACCESS_CLAIM, "foo");
    token2.setOtherClaims(RESOURCE_ACCESS_CLAIM, "bar");
    setClaim(token2, mappingModel, userSession, keycloakSession, clientSessionCtx);
    // THEN: claims are changed to expected value
    assertThat(token2.getOtherClaims(), is(expectedOtherClaims));
  }
}
