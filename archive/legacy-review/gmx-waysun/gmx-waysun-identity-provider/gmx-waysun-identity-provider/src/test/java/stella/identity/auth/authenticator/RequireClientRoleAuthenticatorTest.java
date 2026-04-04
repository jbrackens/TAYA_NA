package stella.identity.auth.authenticator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.Map;
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
import org.keycloak.models.AuthenticatorConfigModel;
import org.keycloak.models.ClientModel;
import org.keycloak.models.GroupModel;
import org.keycloak.models.KeycloakContext;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RoleModel;
import org.keycloak.models.UserModel;
import org.keycloak.representations.idm.OAuth2ErrorRepresentation;

@ExtendWith(MockitoExtension.class)
public class RequireClientRoleAuthenticatorTest {

  private static final String EXPECTED_ROLE_NAME = "expected_role";
  private static final String UNEXPECTED_ROLE_NAME = "unexpected_role";

  private final RequireClientRoleAuthenticator authenticator = new RequireClientRoleAuthenticator();

  @Mock
  private KeycloakSession mockSession;

  @Mock
  private KeycloakContext mockKeycloakContext;

  @Mock
  private ClientModel mockClient;

  @Mock
  private UserModel mockUser;

  @Mock
  AuthenticatorConfigModel mockAuthConfigModel;

  @Mock
  private AuthenticationFlowContext mockAuthFlowContext;

  @Captor
  private ArgumentCaptor<AuthenticationFlowError> errorCapture;

  @Captor
  private ArgumentCaptor<Response> responseCapture;

  @Mock
  private RoleModel mockRole;

  @Mock
  private RoleModel otherMockRole;

  @Mock
  private GroupModel mockGroup;

  private final Map<String, String> authConfig = Map.of(RequireClientRoleAuthenticatorFactory.CLIENT_ROLE_NAME,
      EXPECTED_ROLE_NAME);

  @Test
  @DisplayName("Expect auth failure when session is not available")
  void testAuthFailureOnMissingSession() {
    when(mockAuthFlowContext.getSession()).thenReturn(null);
    doNothing().when(mockAuthFlowContext).failure(errorCapture.capture(), responseCapture.capture());

    testAuthenticateWithFailure(AuthenticationFlowError.INVALID_CLIENT_SESSION, "Missing session");
  }

  @Test
  @DisplayName("Expect auth failure when client is not available")
  void testAuthFailureOnMissingClient() {
    when(mockAuthFlowContext.getSession()).thenReturn(mockSession);
    when(mockSession.getContext()).thenReturn(mockKeycloakContext);
    when(mockKeycloakContext.getClient()).thenReturn(null);
    doNothing().when(mockAuthFlowContext).failure(errorCapture.capture(), responseCapture.capture());

    testAuthenticateWithFailure(AuthenticationFlowError.CLIENT_NOT_FOUND, "Missing client");
  }

  @Test
  @DisplayName("Expect auth failure when user is not available")
  void testAuthFailureOnMissingUser() {
    when(mockAuthFlowContext.getSession()).thenReturn(mockSession);
    when(mockSession.getContext()).thenReturn(mockKeycloakContext);
    when(mockKeycloakContext.getClient()).thenReturn(mockClient);
    when(mockAuthFlowContext.getUser()).thenReturn(null);
    doNothing().when(mockAuthFlowContext).failure(errorCapture.capture(), responseCapture.capture());

    testAuthenticateWithFailure(AuthenticationFlowError.UNKNOWN_USER, "Missing user");
  }

  @Test
  @DisplayName("Expect auth failure when expected role is not present")
  void testAuthFailureOnMissingRole() {
    when(mockAuthFlowContext.getSession()).thenReturn(mockSession);
    when(mockSession.getContext()).thenReturn(mockKeycloakContext);
    when(mockKeycloakContext.getClient()).thenReturn(mockClient);
    when(mockAuthFlowContext.getUser()).thenReturn(mockUser);
    when(mockRole.getName()).thenReturn(UNEXPECTED_ROLE_NAME);
    Stream<RoleModel> userRoles = Stream.of(mockRole);
    when(mockUser.getClientRoleMappingsStream(mockClient)).thenReturn(userRoles);
    when(otherMockRole.getName()).thenReturn(UNEXPECTED_ROLE_NAME);
    Stream<RoleModel> groupRoles = Stream.of(otherMockRole);
    Stream<GroupModel> userGroups = Stream.of(mockGroup);
    when(mockGroup.getClientRoleMappingsStream(mockClient)).thenReturn(groupRoles);
    when(mockUser.getGroupsStream()).thenReturn(userGroups);
    when(mockAuthFlowContext.getAuthenticatorConfig()).thenReturn(mockAuthConfigModel);
    when(mockAuthConfigModel.getConfig()).thenReturn(authConfig);
    doNothing().when(mockAuthFlowContext).failure(errorCapture.capture(), responseCapture.capture());

    testAuthenticateWithFailure(AuthenticationFlowError.INVALID_USER, "Missing user role");
  }

  @Test
  @DisplayName("Expect internal error when role name is not configured")
  void testAuthFailureOnMissingRoleNameInConfig() {
    when(mockAuthFlowContext.getSession()).thenReturn(mockSession);
    when(mockSession.getContext()).thenReturn(mockKeycloakContext);
    when(mockKeycloakContext.getClient()).thenReturn(mockClient);
    when(mockAuthFlowContext.getUser()).thenReturn(mockUser);
    when(mockAuthFlowContext.getAuthenticatorConfig()).thenReturn(mockAuthConfigModel);
    when(mockAuthConfigModel.getConfig()).thenReturn(Collections.emptyMap());
    doNothing().when(mockAuthFlowContext).failure(errorCapture.capture(), responseCapture.capture());

    testAuthenticateWithFailure(AuthenticationFlowError.INTERNAL_ERROR, "Authentication misconfigured");
  }

  @Test
  @DisplayName("Expect auth success when authenticator is not modified and role is present")
  void testAuthSuccessOnDefaultConfigAndPresentUserRole() {
    when(mockAuthFlowContext.getSession()).thenReturn(mockSession);
    when(mockSession.getContext()).thenReturn(mockKeycloakContext);
    when(mockKeycloakContext.getClient()).thenReturn(mockClient);
    when(mockAuthFlowContext.getUser()).thenReturn(mockUser);
    when(mockRole.getName()).thenReturn(RequireClientRoleAuthenticatorFactory.DEFAULT_ROLE);
    Stream<RoleModel> roles = Stream.of(mockRole);
    when(mockUser.getClientRoleMappingsStream(mockClient)).thenReturn(roles);
    when(mockAuthFlowContext.getAuthenticatorConfig()).thenReturn(null);

    authenticator.authenticate(mockAuthFlowContext);
    verify(mockAuthFlowContext).success();
  }

  @Test
  @DisplayName("Expect auth success when config is changed and role is present")
  void testAuthSuccessOnModifiedConfigAndPresentUserRole() {
    when(mockAuthFlowContext.getSession()).thenReturn(mockSession);
    when(mockSession.getContext()).thenReturn(mockKeycloakContext);
    when(mockKeycloakContext.getClient()).thenReturn(mockClient);
    when(mockAuthFlowContext.getUser()).thenReturn(mockUser);
    when(mockRole.getName()).thenReturn(EXPECTED_ROLE_NAME);
    Stream<RoleModel> roles = Stream.of(mockRole);
    when(mockUser.getClientRoleMappingsStream(mockClient)).thenReturn(roles);
    when(mockAuthFlowContext.getAuthenticatorConfig()).thenReturn(mockAuthConfigModel);
    when(mockAuthConfigModel.getConfig()).thenReturn(authConfig);

    authenticator.authenticate(mockAuthFlowContext);
    verify(mockAuthFlowContext).success();
  }

  @Test
  @DisplayName("Expect auth success when role is not assigned directly to user but to one of its groups")
  void testAuthSuccessOnPresentGroupRole() {
    when(mockAuthFlowContext.getSession()).thenReturn(mockSession);
    when(mockSession.getContext()).thenReturn(mockKeycloakContext);
    when(mockKeycloakContext.getClient()).thenReturn(mockClient);
    when(mockAuthFlowContext.getUser()).thenReturn(mockUser);
    when(mockRole.getName()).thenReturn(UNEXPECTED_ROLE_NAME);
    Stream<RoleModel> userRoles = Stream.of(mockRole);
    when(mockUser.getClientRoleMappingsStream(mockClient)).thenReturn(userRoles);
    when(otherMockRole.getName()).thenReturn(EXPECTED_ROLE_NAME);
    Stream<RoleModel> groupRoles = Stream.of(otherMockRole);
    Stream<GroupModel> userGroups = Stream.of(mockGroup);
    when(mockGroup.getClientRoleMappingsStream(mockClient)).thenReturn(groupRoles);
    when(mockUser.getGroupsStream()).thenReturn(userGroups);
    when(mockAuthFlowContext.getAuthenticatorConfig()).thenReturn(mockAuthConfigModel);
    when(mockAuthConfigModel.getConfig()).thenReturn(authConfig);

    authenticator.authenticate(mockAuthFlowContext);
    verify(mockAuthFlowContext).success();
  }

  private void testAuthenticateWithFailure(AuthenticationFlowError error, String errorDescription) {
    authenticator.authenticate(mockAuthFlowContext);
    assertEquals(error, errorCapture.getValue());
    Response response = responseCapture.getValue();
    assertEquals(Response.Status.UNAUTHORIZED.getStatusCode(), response.getStatus());
    OAuth2ErrorRepresentation entity = (OAuth2ErrorRepresentation) response.getEntity();
    assertEquals(OAuthErrorException.INVALID_REQUEST, entity.getError());
    assertEquals(errorDescription, entity.getErrorDescription());
    assertEquals(MediaType.APPLICATION_JSON_TYPE, response.getMediaType());
  }
}
