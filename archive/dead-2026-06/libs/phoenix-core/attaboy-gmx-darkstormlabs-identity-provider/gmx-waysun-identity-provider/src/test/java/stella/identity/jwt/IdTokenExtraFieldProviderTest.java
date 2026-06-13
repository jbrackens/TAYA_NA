package stella.identity.jwt;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import javax.persistence.EntityManager;

import org.apache.commons.lang.RandomStringUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.keycloak.models.AuthenticatedClientSessionModel;
import org.keycloak.models.ClientModel;
import org.keycloak.models.ClientSessionContext;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.ProtocolMapperModel;
import org.keycloak.models.RealmModel;
import org.keycloak.models.RoleModel;
import org.keycloak.models.UserModel;
import org.keycloak.models.UserSessionModel;
import org.keycloak.models.jpa.RoleAdapter;
import org.keycloak.models.jpa.entities.RoleEntity;
import org.keycloak.representations.IDToken;

import stella.identity.crypt.SecretBoxUtils;
import stella.identity.jpa.ClientProject;
import stella.identity.jpa.ClientProjectDTO;
import stella.identity.jpa.Project;
import stella.identity.spi.ProjectService;
import stella.identity.spi.StellaSecretBoxService;
import stella.identity.spi.impl.StellaSecretBoxServiceImpl;

@ExtendWith(MockitoExtension.class)
public class IdTokenExtraFieldProviderTest extends IdTokenExtraFieldProvider {

  private static final String HEX_KEY = "ea87def016584b3c84e5cdbea4dcc868ea87def016584b3c84e5cdbea4dcc868";
  private static final String EXTRA_CLAIM_NAME = "extra";

  @Mock
  private ProjectService projectService;

  @Mock
  private ProtocolMapperModel mappingModel;
  @Mock
  private UserSessionModel userSession;
  @Mock
  private KeycloakSession keycloakSession;
  @Mock
  private ClientSessionContext clientSessionCtx;
  @Mock
  private UserModel user;
  @Mock
  private AuthenticatedClientSessionModel clientSessionModel;
  @Mock
  private ClientModel client;
  @Mock
  private RealmModel realm;
  @Mock
  private EntityManager entityManager;

  private StellaSecretBoxService stellaSecretBoxService = new StellaSecretBoxServiceImpl(Optional.empty(), HEX_KEY);

  private String clientId = RandomStringUtils.randomAlphanumeric(20);
  private UUID projectPublicId = UUID.randomUUID();
  private UUID additionalProjectPublicId = UUID.randomUUID();
  private String userId = UUID.randomUUID().toString();

  @Test
  public void testSetClaim() throws SecretBoxUtils.SecretBoxDecryptionException {

    when(keycloakSession.getProvider(ProjectService.class)).thenReturn(projectService);
    when(keycloakSession.getProvider(StellaSecretBoxService.class)).thenReturn(stellaSecretBoxService);
    when(clientSessionCtx.getClientSession()).thenReturn(clientSessionModel);
    when(userSession.getUser()).thenReturn(user);
    when(user.getId()).thenReturn(userId);
    when(userSession.getRealm()).thenReturn(realm);
    when(realm.getName()).thenReturn("some-realm-id");

    RoleEntity role1 = new RoleEntity();
    role1.setName("foo_role");
    RoleEntity role2 = new RoleEntity();
    role2.setName("bar_role");
    RoleModel role1Adapter = new RoleAdapter(keycloakSession, realm, entityManager, role1);
    RoleModel role2Adapter = new RoleAdapter(keycloakSession, realm, entityManager, role2);
    Stream<RoleModel> roles = Stream.of(role1Adapter, role2Adapter);
    when(clientSessionCtx.getRolesStream()).thenReturn(roles);

    Project primaryProject = mock(Project.class);
    ClientProject primaryClientProject = mock(ClientProject.class);
    when(primaryProject.getProjectPublicId()).thenReturn(projectPublicId);
    when(primaryClientProject.isPrimary()).thenReturn(true);
    ClientProjectDTO primaryProjectMapping = new ClientProjectDTO(primaryClientProject, primaryProject);

    Project additionalProject = mock(Project.class);
    ClientProject additionalClientProject = mock(ClientProject.class);
    when(additionalProject.getProjectPublicId()).thenReturn(additionalProjectPublicId);
    when(additionalClientProject.isPrimary()).thenReturn(false);
    ClientProjectDTO additionalProjectMapping = new ClientProjectDTO(additionalClientProject, additionalProject);

    when(clientSessionModel.getClient()).thenReturn(client);
    when(client.getClientId()).thenReturn(clientId);
    when(projectService.findAllProjectsByClientId(clientId))
        .thenReturn(List.of(primaryProjectMapping, additionalProjectMapping));

    // WHEN: we process token
    IDToken token = new IDToken();
    setClaim(token, mappingModel, userSession, keycloakSession, clientSessionCtx);

    // THEN: it contains extra field with properly encrypted secret box with proper content
    String secretBox = (String) token.getOtherClaims().get(EXTRA_CLAIM_NAME);
    SecretBoxUtils secretBoxUtils = new SecretBoxUtils();
    String decryptedExtra = secretBoxUtils.decrypt(secretBox, HEX_KEY);

    String expectedExtra = String
        .format(
            "{\"jpk\":[\"%s\",\"%s\"],\"primaryProject\":\"%s\",\"additionalProjects\":[\"%s\"]}",
            role1.getName(),
            role2.getName(),
            projectPublicId, additionalProjectPublicId);
    assertThat(decryptedExtra, is(expectedExtra));
  }
}
