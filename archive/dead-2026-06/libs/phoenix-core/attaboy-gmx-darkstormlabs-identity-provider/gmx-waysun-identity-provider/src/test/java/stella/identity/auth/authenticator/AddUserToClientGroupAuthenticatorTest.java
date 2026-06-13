package stella.identity.auth.authenticator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;
import java.util.stream.Stream;

import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.keycloak.OAuthErrorException;
import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.AuthenticationFlowError;
import org.keycloak.models.ClientModel;
import org.keycloak.models.GroupModel;
import org.keycloak.models.KeycloakContext;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.representations.idm.OAuth2ErrorRepresentation;

@ExtendWith(MockitoExtension.class)
public class AddUserToClientGroupAuthenticatorTest {

  private final AddUserToClientGroupAuthenticator authenticator = new AddUserToClientGroupAuthenticator();

  @Mock
  private KeycloakSession mockSession;

  @Mock
  private RealmModel mockRealm;

  @Mock
  private KeycloakContext mockKeycloakContext;

  @Mock
  private ClientModel mockClient;

  @Mock
  private UserModel mockUser;

  @Mock
  private AuthenticationFlowContext mockAuthFlowContext;

  @Mock
  private GroupModel mockGroup;

  @Mock
  private GroupModel otherMockGroup;

  @Captor
  private ArgumentCaptor<AuthenticationFlowError> errorCaptor;

  @Captor
  private ArgumentCaptor<Response> responseCaptor;

  @Captor
  private ArgumentCaptor<GroupModel> groupCaptor;

  @Test
  @DisplayName("Expect auth failure when user is not available")
  void testAuthFailureOnMissingUser() {
    when(mockAuthFlowContext.getUser()).thenReturn(null);
    doNothing().when(mockAuthFlowContext).failure(errorCaptor.capture(), responseCaptor.capture());

    testAuthenticateWithFailure(AuthenticationFlowError.UNKNOWN_USER, "Missing user");
  }

  @Test
  @DisplayName("Expect auth failure when session is not available")
  void testAuthFailureOnMissingSession() {
    when(mockAuthFlowContext.getUser()).thenReturn(mockUser);
    when(mockAuthFlowContext.getSession()).thenReturn(null);
    doNothing().when(mockAuthFlowContext).failure(errorCaptor.capture(), responseCaptor.capture());

    testAuthenticateWithFailure(AuthenticationFlowError.INVALID_CLIENT_SESSION, "Missing session");
  }

  @Test
  @DisplayName("Expect auth failure when client is not available")
  void testAuthFailureOnMissingClient() {
    when(mockAuthFlowContext.getUser()).thenReturn(mockUser);
    when(mockAuthFlowContext.getSession()).thenReturn(mockSession);
    when(mockSession.getContext()).thenReturn(mockKeycloakContext);
    when(mockKeycloakContext.getClient()).thenReturn(null);
    doNothing().when(mockAuthFlowContext).failure(errorCaptor.capture(), responseCaptor.capture());

    testAuthenticateWithFailure(AuthenticationFlowError.CLIENT_NOT_FOUND, "Missing client");
  }

  @Test
  @DisplayName("Expect failure when user is not in group and group doesn't exist")
  void testAuthFailureWhenGroupDoesNotExist() {
    when(mockAuthFlowContext.getUser()).thenReturn(mockUser);
    when(mockAuthFlowContext.getSession()).thenReturn(mockSession);
    when(mockSession.getContext()).thenReturn(mockKeycloakContext);
    when(mockKeycloakContext.getClient()).thenReturn(mockClient);
    when(mockClient.getId()).thenReturn(UUID.randomUUID().toString());
    Stream<GroupModel> userGroups = Stream.of(mockGroup);
    when(mockUser.getGroupsStream()).thenReturn(userGroups);
    when(mockGroup.getName()).thenReturn("group_name1");
    when(mockAuthFlowContext.getRealm()).thenReturn(mockRealm);
    Stream<GroupModel> groupsInRealm = Stream.of(otherMockGroup);
    when(mockRealm.getGroupsStream()).thenReturn(groupsInRealm);
    when(otherMockGroup.getName()).thenReturn("group_name2");
    doNothing().when(mockAuthFlowContext).failure(errorCaptor.capture(), responseCaptor.capture());

    testAuthenticateWithFailure(AuthenticationFlowError.INTERNAL_ERROR, "Client groups misconfigured",
        Response.Status.INTERNAL_SERVER_ERROR, OAuthErrorException.SERVER_ERROR);
  }

  @Test
  @DisplayName("Expect success without user re-joining a group when user is already group member")
  void testAuthSuccessWhenUserAlreadyInGroup() {
    when(mockAuthFlowContext.getUser()).thenReturn(mockUser);
    when(mockAuthFlowContext.getSession()).thenReturn(mockSession);
    when(mockSession.getContext()).thenReturn(mockKeycloakContext);
    String clientDbId = UUID.randomUUID().toString();
    String groupName = "grp_client__" + clientDbId;
    when(mockKeycloakContext.getClient()).thenReturn(mockClient);
    when(mockClient.getId()).thenReturn(clientDbId);
    Stream<GroupModel> userGroups = Stream.of(mockGroup);
    when(mockUser.getGroupsStream()).thenReturn(userGroups);
    when(mockGroup.getName()).thenReturn(groupName);
    when(mockAuthFlowContext.getRealm()).thenReturn(mockRealm);

    authenticator.authenticate(mockAuthFlowContext);
    verify(mockUser, never()).joinGroup(groupCaptor.capture());
    verify(mockAuthFlowContext).success();
  }

  @Test
  @DisplayName("Expect auth success and user added to group when it was not yet a group member")
  void testAuthSuccessWhenUserWasNotInGroupButGroupExists() {
    when(mockAuthFlowContext.getUser()).thenReturn(mockUser);
    when(mockAuthFlowContext.getSession()).thenReturn(mockSession);
    when(mockSession.getContext()).thenReturn(mockKeycloakContext);
    String clientDbId = UUID.randomUUID().toString();
    String groupName = "grp_client__" + clientDbId;
    when(mockKeycloakContext.getClient()).thenReturn(mockClient);
    when(mockClient.getId()).thenReturn(clientDbId);
    Stream<GroupModel> userGroups = Stream.of(mockGroup);
    when(mockUser.getGroupsStream()).thenReturn(userGroups);
    when(mockGroup.getName()).thenReturn("group_name1");
    when(mockAuthFlowContext.getRealm()).thenReturn(mockRealm);
    Stream<GroupModel> groupsInRealm = Stream.of(otherMockGroup);
    when(mockRealm.getGroupsStream()).thenReturn(groupsInRealm);
    when(otherMockGroup.getName()).thenReturn(groupName);
    doNothing().when(mockUser).joinGroup(otherMockGroup);

    authenticator.authenticate(mockAuthFlowContext);
    verify(mockAuthFlowContext).success();
  }

  private void testAuthenticateWithFailure(AuthenticationFlowError error, String errorDescription) {
    testAuthenticateWithFailure(error, errorDescription, Response.Status.UNAUTHORIZED, OAuthErrorException.INVALID_REQUEST);
  }

  private void testAuthenticateWithFailure(AuthenticationFlowError error, String errorDescription, Response.Status status,
      String oAuthErrorException) {
    authenticator.authenticate(mockAuthFlowContext);
    assertEquals(error, errorCaptor.getValue());
    Response response = responseCaptor.getValue();
    assertEquals(status.getStatusCode(), response.getStatus());
    OAuth2ErrorRepresentation entity = (OAuth2ErrorRepresentation) response.getEntity();
    assertEquals(oAuthErrorException, entity.getError());
    assertEquals(errorDescription, entity.getErrorDescription());
    assertEquals(MediaType.APPLICATION_JSON_TYPE, response.getMediaType());
  }
}
