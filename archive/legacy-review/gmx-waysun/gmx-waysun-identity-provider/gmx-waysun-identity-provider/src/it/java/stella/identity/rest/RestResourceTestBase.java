package stella.identity.rest;

import static javax.ws.rs.core.Response.Status.CREATED;
import static javax.ws.rs.core.Response.Status.OK;
import static org.apache.commons.lang.RandomStringUtils.randomAlphanumeric;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.keycloak.protocol.oidc.mappers.OIDCAttributeMapperHelper.INCLUDE_IN_ID_TOKEN;
import static stella.identity.utils.ResponseMatcher.hasStatus;
import static stella.identity.utils.TestUtils.randomProjectCreateRequest;
import static stella.identity.utils.TestUtils.randomProjectRepresentation;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.persistence.*;
import javax.validation.constraints.NotNull;
import javax.ws.rs.core.HttpHeaders;

import org.apache.commons.lang.RandomStringUtils;
import org.jboss.logging.Logger;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;
import org.slf4j.LoggerFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.MockServerContainer;
import org.testcontainers.containers.Network;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.output.Slf4jLogConsumer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.shaded.okhttp3.*;
import org.testcontainers.utility.DockerImageName;

import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.RolesResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.authentication.authenticators.client.ClientIdAndSecretAuthenticator;
import org.keycloak.common.util.MultivaluedHashMap;
import org.keycloak.keys.GeneratedRsaKeyProviderFactory;
import org.keycloak.keys.KeyProvider;
import org.keycloak.models.jpa.entities.ClientEntity;
import org.keycloak.models.utils.KeycloakModelUtils;
import org.keycloak.protocol.oidc.OIDCLoginProtocol;
import org.keycloak.representations.AccessTokenResponse;
import org.keycloak.representations.idm.*;
import org.keycloak.util.JsonSerialization;

import stella.identity.Permissions;
import stella.identity.TestConstants;
import stella.identity.exception.ClientNotFound;
import stella.identity.jpa.ClientProject;
import stella.identity.jpa.Project;
import stella.identity.jwt.IdTokenExtraFieldProvider;
import stella.identity.model.ProjectCreateRequest;
import stella.identity.model.ProjectRepresentation;
import stella.identity.spi.impl.DBTestBase;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public abstract class RestResourceTestBase {

  private static final int keycloakPort = 8080;
  private static final int postgresPort = 5432;
  private static final String dbAddress = "postgres";
  private static final String mockServerAddress = "mockserver";
  private static final Duration containerStartupTimeLimit = Duration.ofSeconds(120);

  private static final String keycloakAdminUser = "admin";
  private static final String keycloakAdminPassword = "password";
  private static final String keycloakDockerImageName = "stella-identity-provider-test:latest";

  private static final String masterRealm = "master";
  private static final String publisherUsername = randomAlphanumeric(20);
  private static final String publisherClientId = randomAlphanumeric(20);

  private static final Network network = Network.newNetwork();

  protected final Logger logger = Logger.getLogger(getClass());

  protected Boolean allowAccessTokenAuthenticationEnvVariable() {
    return false;
  }

  private final PostgreSQLContainer postgreSQLContainer = new PostgreSQLContainer<>(DBTestBase.postgresDockerImageName)
      .withExposedPorts(postgresPort)
      .withDatabaseName(DBTestBase.dbName)
      .withUsername(DBTestBase.dbUser)
      .withPassword(DBTestBase.dbPassword)
      .withNetwork(network)
      .withNetworkAliases(dbAddress);

  protected final GenericContainer mockServerContainer = new MockServerContainer(
      DockerImageName.parse("mockserver/mockserver:mockserver-5.13.0"))
          .withNetwork(network)
          .withNetworkAliases(mockServerAddress);

  protected final GenericContainer keycloakContainer = createBackend();

  protected EntityManager entityManager;
  private EntityManagerFactory emf;

  private GenericContainer createBackend() {
    final String image = keycloakDockerImageName;

    Map<String, String> keycloakEnv = new HashMap<>();
    keycloakEnv.put("KC_DB", "postgres");
    keycloakEnv.put("KC_DB_URL", String.format("jdbc:postgresql://%s/%s", dbAddress, DBTestBase.dbName));
    keycloakEnv.put("KC_DB_USERNAME", DBTestBase.dbUser);
    keycloakEnv.put("KC_DB_PASSWORD", DBTestBase.dbPassword);
    keycloakEnv.put("KEYCLOAK_ADMIN", keycloakAdminUser);
    keycloakEnv.put("KEYCLOAK_ADMIN_PASSWORD", keycloakAdminPassword);
    keycloakEnv.put("ALLOW_ACCESS_TOKEN_AUTHORIZATION", allowAccessTokenAuthenticationEnvVariable().toString());
    keycloakEnv.put("IDENTITY_PROVIDER_EVENT_INGESTOR_BASE_URL",
        String.format("http://%s:%s", mockServerAddress, MockServerContainer.PORT));
    keycloakEnv.put("IDENTITY_PROVIDER_PUBLISHER_USERNAME", publisherUsername);
    keycloakEnv.put("IDENTITY_PROVIDER_PUBLISHER_REALM", masterRealm);
    keycloakEnv.put("IDENTITY_PROVIDER_PUBLISHER_CLIENT_ID", publisherClientId);

    return new GenericContainer(image)
        .withExposedPorts(keycloakPort)
        .withNetwork(network)
        .withNetworkAliases("keycloak")
        .withEnv(keycloakEnv)
        .withCommand("start-dev", "--http-relative-path /auth")
        .dependsOn(postgreSQLContainer, mockServerContainer)
        .waitingFor(Wait.forHttp("/auth"))
        .withLogConsumer(new Slf4jLogConsumer(LoggerFactory.getLogger("testcontainer")))
        .withStartupTimeout(containerStartupTimeLimit);
  }

  @BeforeAll
  public void beforeAll() {
    postgreSQLContainer.start();
    mockServerContainer.start();
    keycloakContainer.start();
    buildKeycloak();
    initEntityManager();
  }

  @AfterAll
  public void afterAll() {
    keycloakContainer.close();
    entityManager.close();
    emf.close();
    mockServerContainer.close();
    postgreSQLContainer.close();
  }

  private void initEntityManager() {
    System.setProperty("db.host", postgreSQLContainer.getContainerIpAddress());
    System.setProperty("db.port", postgreSQLContainer.getFirstMappedPort().toString());
    System.setProperty("db.user", DBTestBase.dbUser);
    System.setProperty("db.password", DBTestBase.dbPassword);
    System.setProperty("db.name", DBTestBase.dbName);
    emf = Persistence.createEntityManagerFactory("my-persistence-unit");
    entityManager = emf.createEntityManager();
  }

  protected static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

  protected String parseKeycloakError(@NotNull Response response) throws IOException {
    return JsonSerialization.readValue(response.body().string(), KeycloakErrorResponse.class)
        .getError();
  }

  protected OkHttpClient client = new OkHttpClient();

  protected String keycloakUrl() {
    return "http://"
        + keycloakContainer.getHost()
        + ":"
        + keycloakContainer.getFirstMappedPort();
  }

  protected Keycloak keycloakInstanceDefault;

  private void buildKeycloak() {
    keycloakInstanceDefault = KeycloakBuilder.builder()
        .serverUrl(String.format("%s/auth/", keycloakUrl()))
        .realm(masterRealm)
        .clientId("admin-cli")
        .username(keycloakAdminUser)
        .password(keycloakAdminPassword)
        .build();
  }

  protected void addStellaPermissionsToRealm(String realmName) {
    addStellaPermissionsToRealm(realmName, List.of());
  }

  protected void addStellaPermissionsToRealm(String realmName, List<String> additionalPermissions) {
    RolesResource rolesResource = keycloakInstanceDefault.realm(realmName).roles();
    Stream.concat(stellaPermissions.stream(), additionalPermissions.stream())
        .forEach(perm -> rolesResource.create(new RoleRepresentation(perm, "", false)));
  }

  protected String createUser(String realmName, String username) {
    UserRepresentation user = new UserRepresentation();
    user.setEnabled(true);
    user.setUsername(username);

    RealmResource realmResource = keycloakInstanceDefault.realm(realmName);
    UsersResource usersResource = realmResource.users();

    javax.ws.rs.core.Response response = usersResource.create(user);
    String userId = CreatedResponseUtil.getCreatedId(response);

    CredentialRepresentation passwordCred = new CredentialRepresentation();
    passwordCred.setTemporary(false);
    passwordCred.setType(CredentialRepresentation.PASSWORD);
    passwordCred.setValue("password");

    usersResource.get(userId).resetPassword(passwordCred);
    return userId;
  }

  protected ClientRepresentation createClient(String realmName, String clientId, String clientSecret) {
    ClientRepresentation client = new ClientRepresentation();
    client.setClientId(clientId);
    client.setName("name" + clientId);
    client.setPublicClient(true);
    client.setProtocol(OIDCLoginProtocol.LOGIN_PROTOCOL);
    client.setClientAuthenticatorType(ClientIdAndSecretAuthenticator.PROVIDER_ID);
    client.setSecret(clientSecret);

    List<ProtocolMapperRepresentation> mappers = new LinkedList<>();

    ProtocolMapperRepresentation extraMapper = createExtraClaimMapper();

    mappers.add(extraMapper);

    client.setProtocolMappers(mappers);

    keycloakInstanceDefault.realm(realmName).clients().create(client);
    client.setId(keycloakInstanceDefault.realm(realmName).clients().findByClientId(clientId).get(0).getId());
    return client;
  }

  protected ClientRepresentation getClient(String realmName, String clientId) {
    List<ClientRepresentation> clients = keycloakInstanceDefault.realm(realmName).clients().findByClientId(clientId);
    if (clients.isEmpty())
      throw new ClientNotFound(clientId);
    return clients.get(0);
  }

  protected ClientRepresentation createRandomClient(String realmName) {
    String clientId = RandomStringUtils.randomAlphanumeric(50);
    String clientSecret = UUID.randomUUID().toString();
    return createClient(realmName, clientId, clientSecret);
  }

  protected void createRealm(String realmName) {
    RealmRepresentation realm = new RealmRepresentation();
    realm.setRealm(realmName);
    realm.setId(realmName);
    realm.setEnabled(true);

    keycloakInstanceDefault.realms().create(realm);
  }

  protected String getUserIdToken(String realmName, String clientId, String clientSecret, String username) {
    return getUserToken(realmName, clientId, clientSecret, username).getIdToken();
  }

  protected AccessTokenResponse getUserToken(String realmName, String clientId, String clientSecret, String username) {
    FormBody formBody = new FormBody.Builder()
        .add("client_id", clientId)
        .add("client_secret", clientSecret)
        .add("username", username)
        .add("password", "password")
        .add("grant_type", "password")
        .add("scope", "openid")
        .build();
    String url = String.format("%s/auth/realms/%s/protocol/openid-connect/token", keycloakUrl(), realmName);
    Request.Builder builder = new Request.Builder().url(url).post(formBody);
    AccessTokenResponse accessTokenResponse = null;
    try {
      Response response = send(builder);
      assertThat(response, hasStatus(OK));
      String body = response.body().string();
      accessTokenResponse = JsonSerialization.readValue(body,
          AccessTokenResponse.class);
    } catch (IOException e) {
      logger.error(e);
    }
    return accessTokenResponse;
  }

  protected Request.Builder builderWithUrlAndToken(String url, String token) {
    return new Request.Builder()
        .url(url)
        .addHeader(HttpHeaders.AUTHORIZATION, String.format("Bearer %s", token));
  }

  protected Response send(Request.Builder builder) throws IOException {
    return client.newCall(builder.build()).execute();
  }

  protected void addTokenHeader(Request.Builder builder, Optional<String> idToken) {
    idToken.ifPresent(token -> builder.addHeader(HttpHeaders.AUTHORIZATION, String.format("Bearer %s", token)));
  }

  protected String projectsUrl(String realmName) {
    return String.format("%s/auth/realms/%s/stella/projects", keycloakUrl(), realmName);
  }

  protected String clientsUrl(String realmName) {
    return String.format("%s/auth/realms/%s/stella/clients", keycloakUrl(), realmName);
  }

  protected Response createProject(String realmName, ProjectCreateRequest project, String token)
      throws IOException {
    RequestBody body = RequestBody.create(JSON, JsonSerialization.writeValueAsString(project));
    return send(builderWithUrlAndToken(projectsUrl(realmName), token).post(body));
  }

  protected ProjectRepresentation createRandomProject(String realmName, String userToken) throws IOException {
    ProjectCreateRequest project = randomProjectCreateRequest();
    project.setKid(null);
    return createProjectRepresentation(realmName, userToken, project);
  }

  protected ProjectRepresentation createRandomProjectWithKey(String realmName, String userToken) throws IOException {
    ProjectCreateRequest project = randomProjectCreateRequest();
    project.setKid(createRsaKey(realmName));
    return createProjectRepresentation(realmName, userToken, project);
  }

  private ProjectRepresentation createProjectRepresentation(String realmName, String userToken, ProjectCreateRequest request)
      throws IOException {
    Response response = createProject(realmName, request, userToken);
    assertThat(response, hasStatus(CREATED));
    ProjectRepresentation representation = new ProjectRepresentation(request, realmName);
    representation.setProjectPublicId(getCreatedProjectPublicId(response));
    return representation;
  }

  protected UUID getCreatedProjectPublicId(Response response) {
    // get the created project public id from the Location header
    String location = response.header("Location");
    return UUID.fromString(location.substring(location.lastIndexOf("/") + 1));
  }

  protected String createRsaKey(String realmName) {
    ComponentRepresentation rep = new ComponentRepresentation();
    rep.setName(RandomStringUtils.randomAlphabetic(20));
    rep.setParentId(realmName);
    rep.setProviderId(GeneratedRsaKeyProviderFactory.ID);
    rep.setProviderType(KeyProvider.class.getName());
    rep.setConfig(new MultivaluedHashMap<>());

    javax.ws.rs.core.Response response = keycloakInstanceDefault.realm(realmName).components().add(rep);
    String id = getCreatedId(response);
    Optional<KeysMetadataRepresentation.KeyMetadataRepresentation> keyOpt = keycloakInstanceDefault.realm(realmName).keys()
        .getKeyMetadata().getKeys().stream().filter(key -> key.getProviderId().equals(id)).findFirst();

    return keyOpt.orElseThrow().getKid();
  }

  protected String getCreatedId(javax.ws.rs.core.Response response) {
    assertThat(response.getStatusInfo(), is(javax.ws.rs.core.Response.Status.CREATED));
    URI location = response.getLocation();
    if (location == null) {
      return null;
    }
    String path = location.getPath();
    return path.substring(path.lastIndexOf('/') + 1);
  }

  protected Project addProject(String realm) {
    return runInTransaction(() -> {
      ProjectRepresentation projectRepresentation = randomProjectRepresentation(realm);
      Project project = projectRepresentation.toProjectWithoutId();
      entityManager.persist(project);
      return project;
    });
  }

  protected void associateClientWithPrimaryProject(String clientId, Long projectId, String realmName) {
    associateClientWithProject(realmName, clientId, projectId, /* isPrimary= */ true);
  }

  protected void associateClientWithProject(String realmName, String clientId, Long projectId, boolean isPrimary) {
    runInTransaction(() -> {
      ClientEntity client = entityManager.createNamedQuery("findClientByClientId", ClientEntity.class)
          .setParameter("clientId", clientId)
          .setParameter("realm", realmName)
          .getSingleResult();

      entityManager.persist(new ClientProject(client.getId(), projectId, isPrimary));
    });
  }

  protected <T> T runInTransaction(Supplier<T> supplier) {
    EntityTransaction transaction = entityManager.getTransaction();
    transaction.begin();
    T result = supplier.get();
    transaction.commit();
    return result;
  }

  protected void runInTransaction(Runnable runnable) {
    EntityTransaction transaction = entityManager.getTransaction();
    transaction.begin();
    runnable.run();
    transaction.commit();
  }

  protected AccessTokenResponse userWithPermissionToken(List<String> permissions, String realmName,
      String clientId, String clientSecret) {
    String username = RandomStringUtils.randomAlphanumeric(36);
    String userId = createUser(realmName, username);

    RolesResource rolesResource = keycloakInstanceDefault.realm(realmName).roles();

    List<RoleRepresentation> roles = permissions.stream().map(p -> rolesResource.get(p).toRepresentation())
        .collect(Collectors.toList());

    keycloakInstanceDefault.realm(realmName).users().get(userId).roles().realmLevel()
        .add(roles);

    return getUserToken(realmName, clientId, clientSecret, username);
  }

  protected AccessTokenResponse userTokenForRandomlyCreatedNewRealm(List<String> permissions) {
    String otherRealm = RandomStringUtils.randomAlphanumeric(20);
    createRealm(otherRealm);
    ClientRepresentation client = createRandomClient(otherRealm);
    String username = RandomStringUtils.randomAlphanumeric(20);
    String userId = createUser(otherRealm, username);

    Project project = addProject(otherRealm);
    String clientSecret = UUID.randomUUID().toString();
    String clientId = randomAlphanumeric(36);
    createClient(otherRealm, clientId, clientSecret);
    associateClientWithPrimaryProject(clientId, project.getId(), otherRealm);

    addStellaPermissionsToRealm(otherRealm);
    RolesResource rolesResource = keycloakInstanceDefault.realm(otherRealm).roles();
    List<RoleRepresentation> roles = permissions.stream().map(p -> rolesResource.get(p).toRepresentation())
        .collect(Collectors.toList());
    keycloakInstanceDefault.realm(otherRealm).users().get(userId).roles().realmLevel()
        .add(roles);
    return getUserToken(otherRealm, client.getClientId(), client.getSecret(), username);
  }

  protected List<String> stellaPermissions = List.of(
      Permissions.EVENT_INGESTOR_ADMIN_ANY_EVENT_WRITE,
      Permissions.OIDC_ADMIN_SIGN,
      "oidc:address:read",
      "oidc:address:write",
      "oidc:admin:clear_oidc:write",
      TestConstants.Permissions.OIDC_ADMIN_PROJECT_READ,
      TestConstants.Permissions.OIDC_SUPERADMIN_PROJECT_READ,
      TestConstants.Permissions.OIDC_ADMIN_PROJECT_WRITE,
      "oidc:admin:openid:read",
      "oidc:admin:openid:write",
      "oidc:admin:profile:address:read",
      "oidc:admin:profile:address:write",
      "oidc:admin:profile:email:read",
      "oidc:admin:profile:email:write",
      "oidc:admin:profile:last_seen:write",
      "oidc:admin:profile:password:write",
      "oidc:admin:profile:phone_number:read",
      "oidc:admin:profile:phone_number:write",
      "oidc:admin:profile:read",
      "oidc:admin:profile:social_account:read",
      "oidc:admin:profile:social_account:write",
      "oidc:admin:profile:write",
      "oidc:email:read",
      "oidc:email:write",
      "oidc:password:write",
      "oidc:phone_number:read",
      "oidc:phone_number:write",
      "oidc:profile:read",
      "oidc:profile:write",
      "oidc:register:write",
      "oidc:social:token:read",
      "payment_gateway:admin:china_mobile:read",
      "payment_gateway:admin:china_mobile:write",
      "user_context:admin:context:read",
      "user_context:admin:context:write",
      "virtual_store:admin:antstream:configuration:read",
      "virtual_store:admin:antstream:configuration:write",
      "virtual_store:admin:any:backpack:activate",
      "virtual_store:admin:any:backpack:read",
      "virtual_store:admin:any:backpack:write",
      "virtual_store:admin:any:order:backpack:create",
      "virtual_store:admin:any:order:deliver",
      "virtual_store:admin:any:order:log:write",
      "virtual_store:admin:any:order:read",
      "virtual_store:admin:any:order:write",
      "virtual_store:admin:any:subscription:deactivate",
      "virtual_store:admin:any:subscription:read",
      "virtual_store:admin:any:subscription:write",
      "virtual_store:admin:order:read",
      "virtual_store:admin:order:write",
      "virtual_store:admin:product:read",
      "virtual_store:admin:product:write",
      "virtual_store:admin:subscription:read",
      "virtual_store:admin:subscription:write",
      "virtual_store:antstream:configuration:read",
      "virtual_store:antstream:configuration:write",
      "virtual_store:order:read",
      "virtual_store:order:write",
      "virtual_store:product:read",
      "virtual_store:product:write",
      "virtual_store:subscription:read",
      "virtual_store:subscription:write");

  protected String idToken(AccessTokenResponse token) {
    return token.getIdToken();
  }

  protected String accessToken(AccessTokenResponse token) {
    return token.getToken();
  }

  private ProtocolMapperRepresentation createExtraClaimMapper() {
    return createIdTokenMapper("stella-extra", IdTokenExtraFieldProvider.PROVIDER_ID);
  }

  private ProtocolMapperRepresentation createIdTokenMapper(String mapperName, String providerId) {
    ProtocolMapperRepresentation extraMapper = new ProtocolMapperRepresentation();
    extraMapper.setId(KeycloakModelUtils.generateId());
    extraMapper.setName(mapperName);
    extraMapper.setProtocol(OIDCLoginProtocol.LOGIN_PROTOCOL);
    extraMapper.setProtocolMapper(providerId);
    HashMap<String, String> config = new HashMap();
    config.put(INCLUDE_IN_ID_TOKEN, "true");
    extraMapper.setConfig(config);
    return extraMapper;
  }
}
