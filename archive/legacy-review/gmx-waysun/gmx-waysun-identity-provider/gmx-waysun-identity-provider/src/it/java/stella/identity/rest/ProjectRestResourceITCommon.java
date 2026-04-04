package stella.identity.rest;

import static java.util.UUID.randomUUID;
import static javax.ws.rs.core.Response.Status.*;
import static org.apache.commons.lang.RandomStringUtils.*;
import static org.hamcrest.CoreMatchers.hasItems;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.CoreMatchers.not;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static stella.identity.utils.ResponseMatcher.hasStatus;
import static stella.identity.utils.TestUtils.randomProjectCreateRequest;
import static stella.identity.utils.TestUtils.randomProjectRepresentation;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.commons.lang.RandomStringUtils;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.testcontainers.shaded.okhttp3.Request;
import org.testcontainers.shaded.okhttp3.RequestBody;
import org.testcontainers.shaded.okhttp3.Response;

import org.keycloak.representations.AccessTokenResponse;
import org.keycloak.representations.idm.ClientRepresentation;
import org.keycloak.util.JsonSerialization;

import stella.identity.TestConstants;
import stella.identity.jpa.Project;
import stella.identity.model.ClientInfo;
import stella.identity.model.ExtendedProjectRepresentation;
import stella.identity.model.ProjectCreateRequest;
import stella.identity.model.ProjectRepresentation;
import stella.identity.model.ProjectUpdateInputModel;
import stella.identity.rest.responses.ExtendedProjectRepresentationWrapper;
import stella.identity.rest.responses.ProjectRepresentationListWrapper;
import stella.identity.rest.responses.ProjectRepresentationWrapper;

public abstract class ProjectRestResourceITCommon extends RestResourceTestBase {

  protected AccessTokenResponse userWithOtherPermissionsToken;
  protected AccessTokenResponse projectReaderToken;
  protected AccessTokenResponse projectSuperAdminReaderToken;
  protected AccessTokenResponse projectWriterToken;
  protected String clientId;
  protected String clientSecret;
  protected static final String MASTER_REALM_NAME = "master";

  @BeforeAll
  void before() {
    clientSecret = UUID.randomUUID().toString();
    clientId = randomAlphanumeric(36);
    Project project = addProject(MASTER_REALM_NAME);
    createClient(MASTER_REALM_NAME, clientId, clientSecret);
    associateClientWithPrimaryProject(clientId, project.getId(), MASTER_REALM_NAME);

    addStellaPermissionsToRealm(MASTER_REALM_NAME);

    List<String> allNotProjectPermissions = stellaPermissions.stream()
        .filter(p -> !p.startsWith("oidc:admin:project") && !p.startsWith("oidc:superadmin:project"))
        .collect(Collectors.toList());
    userWithOtherPermissionsToken = getTokenWithPermission(MASTER_REALM_NAME, allNotProjectPermissions.toArray(new String[0]));

    projectReaderToken = getTokenWithPermission(MASTER_REALM_NAME, TestConstants.Permissions.OIDC_ADMIN_PROJECT_READ);

    projectSuperAdminReaderToken = getTokenWithPermission(MASTER_REALM_NAME,
        TestConstants.Permissions.OIDC_SUPERADMIN_PROJECT_READ);

    projectWriterToken = getTokenWithPermission(MASTER_REALM_NAME, TestConstants.Permissions.OIDC_ADMIN_PROJECT_WRITE);
  }

  private AccessTokenResponse getTokenWithPermission(String realmName, String... permissions) {
    return userWithPermissionToken(Arrays.asList(permissions), realmName, clientId, clientSecret);
  }

  @Test
  void shouldFailIfNameNotProvided() throws IOException {
    ProjectCreateRequest project = new ProjectCreateRequest();

    Response response = createProject(project, idToken(projectWriterToken));

    assertThat(response, hasStatus(BAD_REQUEST));
    assertThat(parseKeycloakError(response), is("'name' is required"));
  }

  @Test
  void cannotCreateProjectIfTokenIssuedByOtherRealm() throws IOException {
    String otherRealmName = randomRealmName();
    String otherClientId = RandomStringUtils.randomAlphabetic(20);
    String userName = RandomStringUtils.randomAlphabetic(20).toLowerCase();
    String otherClientSecret = UUID.randomUUID().toString();

    createRealm(otherRealmName);
    createClient(otherRealmName, otherClientId, otherClientSecret);
    createUser(otherRealmName, userName);
    String idToken = getUserIdToken(otherRealmName, otherClientId, otherClientSecret, userName);

    Response response = createProject(randomProjectCreateRequest(), idToken);

    assertThat(response, hasStatus(UNAUTHORIZED));
  }

  @Test
  void cannotCreateProjectIfTokenNotProvided() throws IOException {
    RequestBody body = RequestBody.create(JSON, JsonSerialization.writeValueAsString(randomProjectCreateRequest()));
    Request.Builder builder = new Request.Builder().url(this.projectsUrl(MASTER_REALM_NAME)).post(body);

    assertThat(send(builder), hasStatus(UNAUTHORIZED));
  }

  @Test
  void otherRealmProjectWriterCannotCreateProjectUsingIdAndAccessToken() throws IOException {
    AccessTokenResponse token = userTokenForRandomlyCreatedNewRealm(
        List.of(TestConstants.Permissions.OIDC_ADMIN_PROJECT_WRITE));

    assertThat(createProject(randomProjectCreateRequest(), idToken(token)), hasStatus(UNAUTHORIZED));
    assertThat(createProject(randomProjectCreateRequest(), accessToken(token)), hasStatus(UNAUTHORIZED));
  }

  @Test
  @DisplayName("cannot create project without 'oidc:admin:project:write' permission")
  void cannotCreateProjectWithoutWritePermission() throws IOException {
    Response response = createProject(randomProjectCreateRequest(), idToken(userWithOtherPermissionsToken));

    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  @DisplayName("cannot create project with 'oidc:admin:project:read' permission")
  void cannotCreateProjectWithReadPermission() throws IOException {
    Response response = createProject(randomProjectCreateRequest(), idToken(projectReaderToken));

    assertThat(response, hasStatus(FORBIDDEN));
  }

  @ParameterizedTest
  @MethodSource("invalidProjectInputs")
  void cannotCreateProjectWithInvalidInput(ProjectRepresentation project) throws IOException {
    ProjectCreateRequest request = new ProjectCreateRequest();
    request.setKid(project.getKid());
    request.setName(project.getName());
    request.setDescription(project.getDescription());

    assertThat(createProject(request, idToken(projectWriterToken)), hasStatus(BAD_REQUEST));
  }

  @Test
  void cannotCreateProjectIfKeyNotFound() throws IOException {
    ProjectCreateRequest project = randomProjectCreateRequest();

    Response response = createProject(project, idToken(projectWriterToken));

    assertThat(response, hasStatus(BAD_REQUEST));
    assertThat(parseKeycloakError(response), is(String.format("Key '%s' not found", project.getKid())));
  }

  @Test
  void cannotCreateProjectIfKeyBelongsToOtherRealm() throws IOException {
    String otherRealm = randomRealmName();
    createRealm(otherRealm);
    ProjectCreateRequest project = randomProjectCreateRequest();
    String kid = createRsaKey(otherRealm);
    project.setKid(kid);

    Response response = createProject(project, idToken(projectWriterToken));

    assertThat(response, hasStatus(BAD_REQUEST));
    assertThat(parseKeycloakError(response), is(String.format("Key '%s' not found", kid)));
  }

  @Test
  void cannotCreateProjectWithAlreadyUsedKey() throws IOException {
    ProjectCreateRequest project1 = randomProjectCreateRequest();
    String kid = createRsaKey(MASTER_REALM_NAME);
    project1.setKid(kid);

    Response response1 = createProject(project1, idToken(projectWriterToken));

    assertThat(response1, hasStatus(CREATED));

    ProjectCreateRequest project2 = randomProjectCreateRequest();
    project2.setKid(kid);

    Response response2 = createProject(project2, idToken(projectWriterToken));
    assertThat(response2, hasStatus(BAD_REQUEST));
    assertThat(parseKeycloakError(response2), is(String.format("Key '%s' is already in use", kid)));
  }

  @Test
  @DisplayName("can create project with 'oidc:admin:project:write' permission")
  void shouldCreateProject() throws IOException {
    ProjectCreateRequest project = randomProjectCreateRequest();
    project.setKid(null);

    Response response = createProject(project, idToken(projectWriterToken));

    assertThat(response, hasStatus(CREATED));

    UUID createProjectPublicId = getCreatedProjectPublicId(response);
    ProjectRepresentation createProjectResponse = new ProjectRepresentation(project, MASTER_REALM_NAME);
    createProjectResponse.setProjectPublicId(createProjectPublicId);

    ProjectRepresentation createdProject = getProjectRepresentation(createProjectPublicId, idToken(projectReaderToken));
    assertThat(createdProject, is(createProjectResponse));
  }

  @Test
  void shouldCreateProjectWithKeyProvided() throws IOException {
    ProjectCreateRequest project = randomProjectCreateRequest();
    project.setKid(createRsaKey(MASTER_REALM_NAME));

    Response response = createProject(project, idToken(projectWriterToken));

    assertThat(response, hasStatus(CREATED));
  }

  @Test
  void cannotGetProjectIfTokenNotProvided() throws IOException {
    ProjectRepresentation createdProject = createRandomProject();
    Request.Builder builder = new Request.Builder().url(projectUrl(MASTER_REALM_NAME, createdProject.getProjectPublicId()))
        .get();

    assertThat(send(builder), hasStatus(UNAUTHORIZED));
  }

  @Test
  void otherRealProjectReaderCannotGetProject() throws IOException {
    ProjectRepresentation createdProject = createRandomProject();
    AccessTokenResponse token = userTokenForRandomlyCreatedNewRealm(List.of(TestConstants.Permissions.OIDC_ADMIN_PROJECT_READ));

    assertThat(getProjectResponse(createdProject.getProjectPublicId(), idToken(token)), hasStatus(UNAUTHORIZED));
    assertThat(getProjectResponse(createdProject.getProjectPublicId(), accessToken(token)), hasStatus(UNAUTHORIZED));
  }

  @Test
  @DisplayName("cannot get project without 'oidc:admin:project:read' or 'oidc:superadmin:project:read' permission")
  void cannotGetProjectWithoutReadPermission() throws IOException {
    ProjectRepresentation createdProject = createRandomProject();

    Response response = getProjectResponse(createdProject.getProjectPublicId(), idToken(userWithOtherPermissionsToken));

    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  @DisplayName("cannot get project with 'oidc:admin:project:write' permission")
  void cannotGetProjectWithWritePermission() throws IOException {
    ProjectRepresentation createdProject = createRandomProject();

    Response response = getProjectResponse(createdProject.getProjectPublicId(), idToken(projectWriterToken));

    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  @DisplayName("can get project in realm with 'oidc:admin:project:read' permission")
  void shouldGetProjectInRealm() throws IOException {
    Project createdProject = addProject(MASTER_REALM_NAME);
    ProjectRepresentation createdProjectRep = new ProjectRepresentation(createdProject);

    String clientSecret1 = UUID.randomUUID().toString();
    String clientId1 = randomAlphanumeric(36);
    ClientRepresentation client1 = createClient(MASTER_REALM_NAME, clientId1, clientSecret1);
    String clientSecret2 = UUID.randomUUID().toString();
    String clientId2 = randomAlphanumeric(36);
    ClientRepresentation client2 = createClient(MASTER_REALM_NAME, clientId2, clientSecret2);
    associateClientWithProject(MASTER_REALM_NAME, clientId1, createdProject.getId(), /* isPrimary= */ true);
    associateClientWithProject(MASTER_REALM_NAME, clientId2, createdProject.getId(), /* isPrimary= */ false);

    ExtendedProjectRepresentation project = getExtendedProjectRepresentation(MASTER_REALM_NAME,
        createdProject.getProjectPublicId(),
        idToken(projectReaderToken));
    assertThat(new ProjectRepresentation(project), equalTo(createdProjectRep));
    assertThat(project.getClients().getPrimary(),
        equalTo(List.of(new ClientInfo(clientId1, client1.getId(), client1.getName()))));
    assertThat(project.getClients().getAdditional(),
        equalTo(List.of(new ClientInfo(clientId2, client2.getId(), client2.getName()))));
    assertThat(project.getRealmId(), equalTo(MASTER_REALM_NAME));
  }

  @Test
  @DisplayName("can't get project existing in other realm with 'oidc:admin:project:read' permission")
  void cannotGetOtherRealmProject() throws IOException {
    // GIVEN: project in other realm than master
    String otherRealmName = createRealmWithStellaPermissions();
    Project otherRealmProject = addProject(otherRealmName);

    // WHEN: we try to access project in other realm using master in url
    Response response = getProjectResponse(MASTER_REALM_NAME,
        otherRealmProject.getProjectPublicId(),
        idToken(projectReaderToken));

    // THEN: we can't find such a project
    assertThat(response, hasStatus(NOT_FOUND));
    assertThat(parseKeycloakError(response),
        is(String.format("Project '%s' not found", otherRealmProject.getProjectPublicId())));
  }

  @Test
  @DisplayName("can get project in realm with 'oidc:superadmin:project:read' permission")
  void shouldGetProjectInRealmAsSuperAdmin() throws IOException {
    ProjectRepresentation createdProject = createRandomProjectWithKey();

    ExtendedProjectRepresentation project = getExtendedProjectRepresentation(MASTER_REALM_NAME,
        createdProject.getProjectPublicId(),
        idToken(projectSuperAdminReaderToken));
    assertThat(new ProjectRepresentation(project), equalTo(createdProject));
    assertThat(project.getClients().getPrimary(), empty());
    assertThat(project.getClients().getAdditional(), empty());
    assertThat(project.getRealmId(), equalTo(MASTER_REALM_NAME));
  }

  @Test
  @DisplayName("can't get project in other realm with 'oidc:superadmin:project:read' permission when not using master realm")
  void cannotGetOtherRealmProjectAsSuperAdminViaOtherRealmThanMaster() throws IOException {
    String otherRealmName = createRealmWithStellaPermissions();

    String otherRealmClientSecret = UUID.randomUUID().toString();
    String otherRealmClientId = randomAlphanumeric(36);
    createClient(otherRealmName, otherRealmClientId, otherRealmClientSecret);
    Project otherRealmProject = addProject(otherRealmName);
    associateClientWithPrimaryProject(otherRealmClientId, otherRealmProject.getId(), otherRealmName);

    String otherRealmProjectReaderToken = idToken(
        userWithPermissionToken(List.of(TestConstants.Permissions.OIDC_SUPERADMIN_PROJECT_READ), otherRealmName,
            otherRealmClientId, otherRealmClientSecret));

    // GIVEN: project in master realm
    ProjectRepresentation createdProject = createRandomProjectWithKey();

    // WHEN: we try to access project in master using other realm in url
    Response response = getProjectResponse(otherRealmName, createdProject.getProjectPublicId(), otherRealmProjectReaderToken);
    // THEN: we can't find such a project
    assertThat(response, hasStatus(NOT_FOUND));
    assertThat(parseKeycloakError(response), is(String.format("Project '%s' not found", createdProject.getProjectPublicId())));
  }

  @Test
  @DisplayName("can get project in other realm with 'oidc:superadmin:project:read' permission when using master realms")
  void shouldGetOtherRealmProjectAsSuperAdminViaMasterRealm() throws IOException {
    // GIVEN: project in other realm than master
    String otherRealmName = createRealmWithStellaPermissions();
    Project createdProject = addProject(otherRealmName);
    ProjectRepresentation createdProjectRep = new ProjectRepresentation(createdProject);

    String clientSecret1 = UUID.randomUUID().toString();
    String clientId1 = randomAlphanumeric(36);
    ClientRepresentation otherRealmClient1 = createClient(otherRealmName, clientId1, clientSecret1);
    String clientSecret2 = UUID.randomUUID().toString();
    String clientId2 = randomAlphanumeric(36);
    ClientRepresentation otherRealmClient2 = createClient(otherRealmName, clientId2, clientSecret2);
    associateClientWithProject(otherRealmName, clientId1, createdProject.getId(), /* isPrimary= */ true);
    associateClientWithProject(otherRealmName, clientId2, createdProject.getId(), /* isPrimary= */ false);

    // WHEN: we try to access project in other realm using master in url
    ExtendedProjectRepresentation project = getExtendedProjectRepresentation(MASTER_REALM_NAME,
        createdProject.getProjectPublicId(),
        idToken(projectSuperAdminReaderToken));

    // THEN: it's allowed, and we got proper project data
    assertThat(new ProjectRepresentation(project), equalTo(createdProjectRep));
    assertThat(project.getClients().getPrimary(),
        equalTo(List.of(new ClientInfo(clientId1, otherRealmClient1.getId(), otherRealmClient1.getName()))));
    assertThat(project.getClients().getAdditional(),
        equalTo(List.of(new ClientInfo(clientId2, otherRealmClient2.getId(), otherRealmClient2.getName()))));
    assertThat(project.getRealmId(), equalTo(otherRealmName));
  }

  @Test
  void shouldFailToGetNotExistentProject() throws IOException {
    UUID publicId = randomUUID();

    Response response = getProjectResponse(publicId, idToken(projectReaderToken));

    assertThat(response, hasStatus(NOT_FOUND));
    assertThat(parseKeycloakError(response), is(String.format("Project '%s' not found", publicId)));
  }

  @Test
  void cannotModifyProjectIfTokenNotProvided() throws IOException {
    ProjectRepresentation createdProject = createRandomProject();
    ProjectUpdateInputModel projectUpdateInputModel = randomProjectUpdateInputModel();
    RequestBody body = RequestBody.create(JSON, JsonSerialization.writeValueAsString(projectUpdateInputModel));
    Request.Builder builder = new Request.Builder().url(projectUrl(MASTER_REALM_NAME, createdProject.getProjectPublicId()))
        .put(body);

    assertThat(send(builder), hasStatus(UNAUTHORIZED));
  }

  @Test
  void otherRealmWriterCannotModifyProject() throws IOException {
    ProjectRepresentation createdProject = createRandomProject();
    ProjectUpdateInputModel projectUpdateInputModel = randomProjectUpdateInputModel();

    AccessTokenResponse token = userTokenForRandomlyCreatedNewRealm(
        List.of(TestConstants.Permissions.OIDC_ADMIN_PROJECT_WRITE));

    assertThat(updateProject(createdProject.getProjectPublicId(), projectUpdateInputModel, idToken(token)),
        hasStatus(UNAUTHORIZED));
    assertThat(updateProject(createdProject.getProjectPublicId(), projectUpdateInputModel, accessToken(token)),
        hasStatus(UNAUTHORIZED));
  }

  @Test
  @DisplayName("cannot modify project without 'oidc:admin:project:write' permission")
  void cannotModifyProjectWithoutWritePermission() throws IOException {
    ProjectRepresentation createdProject = createRandomProject();

    ProjectUpdateInputModel projectUpdateInputModel = randomProjectUpdateInputModel();

    Response response = updateProject(createdProject.getProjectPublicId(), projectUpdateInputModel,
        idToken(userWithOtherPermissionsToken));

    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  @DisplayName("cannot modify project with 'oidc:admin:project:read' permission")
  void cannotModifyProjectWithReadPermission() throws IOException {
    ProjectRepresentation createdProject = createRandomProject();

    ProjectUpdateInputModel projectUpdateInputModel = randomProjectUpdateInputModel();

    Response response = updateProject(createdProject.getProjectPublicId(), projectUpdateInputModel,
        idToken(projectReaderToken));

    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  void shouldModifyProject() throws IOException {
    testSuccessfulProjectModificationUsingToken(idToken(projectWriterToken), idToken(projectReaderToken));
  }

  @ParameterizedTest
  @MethodSource("invalidProjectInputs")
  void cannotModifyProjectWithInvalidInput(ProjectRepresentation project) throws IOException {
    ProjectRepresentation createdProject = createRandomProject();
    ProjectUpdateInputModel projectUpdateInputModel = toProjectUpdateInputModel(project);

    assertThat(updateProject(createdProject.getProjectPublicId(), projectUpdateInputModel, idToken(projectWriterToken)),
        hasStatus(BAD_REQUEST));
  }

  @Test
  void cannotModifyProjectIfKeyNotFound() throws IOException {
    ProjectRepresentation createdProject = createRandomProject();
    ProjectUpdateInputModel projectUpdateInputModel = toProjectUpdateInputModel(createdProject);
    String kid = RandomStringUtils.randomAlphanumeric(32);
    projectUpdateInputModel.setKid(kid);

    Response response = updateProject(createdProject.getProjectPublicId(), projectUpdateInputModel,
        idToken(projectWriterToken));

    assertThat(response, hasStatus(BAD_REQUEST));
    assertThat(parseKeycloakError(response), is(String.format("Key '%s' not found", kid)));
  }

  @Test
  void cannotModifyProjectIfKeyBelongsToOtherRealm() throws IOException {
    String otherRealm = randomRealmName();
    createRealm(otherRealm);

    ProjectRepresentation createdProject = createRandomProject();
    ProjectUpdateInputModel projectUpdateInputModel = toProjectUpdateInputModel(createdProject);
    String kid = createRsaKey(otherRealm);
    projectUpdateInputModel.setKid(kid);

    Response response = updateProject(createdProject.getProjectPublicId(), projectUpdateInputModel,
        idToken(projectWriterToken));

    assertThat(response, hasStatus(BAD_REQUEST));
    assertThat(parseKeycloakError(response), is(String.format("Key '%s' not found", kid)));
  }

  @Test
  void cannotModifyProjectIfKeyIsAlreadyInUse() throws IOException {
    ProjectRepresentation project1 = createRandomProjectWithKey();
    ProjectRepresentation project2 = createRandomProject();
    ProjectUpdateInputModel projectUpdateInputModel = toProjectUpdateInputModel(project2);
    projectUpdateInputModel.setKid(project1.getKid());

    Response response = updateProject(project2.getProjectPublicId(), projectUpdateInputModel, idToken(projectWriterToken));

    assertThat(response, hasStatus(BAD_REQUEST));
    assertThat(parseKeycloakError(response), is(String.format("Key '%s' is already in use", project1.getKid())));
  }

  @Test
  void shouldFailToModifyNotExistentProject() throws IOException {
    ProjectUpdateInputModel createdProject = randomProjectUpdateInputModel();
    UUID publicId = randomUUID();

    Response response = updateProject(publicId, createdProject, idToken(projectWriterToken));

    assertThat(response, hasStatus(NOT_FOUND));
    assertThat(parseKeycloakError(response), is(String.format("Project '%s' not found", publicId)));
  }

  @Test
  void cannotListProjectsIfTokenNotProvided() throws IOException {
    Request.Builder builder = new Request.Builder().url(projectsUrl(MASTER_REALM_NAME)).get();

    assertThat(send(builder), hasStatus(UNAUTHORIZED));
  }

  @Test
  void otherRealmProjectReaderCannotListProjects() throws IOException {
    AccessTokenResponse token = userTokenForRandomlyCreatedNewRealm(List.of(TestConstants.Permissions.OIDC_ADMIN_PROJECT_READ));

    assertThat(getProjects(idToken(token)), hasStatus(UNAUTHORIZED));
    assertThat(getProjects(accessToken(token)), hasStatus(UNAUTHORIZED));
  }

  @Test
  @DisplayName("cannot list projects without 'oidc:admin:project:read' or 'oidc:superadmin:project:read' permission")
  void cannotListProjectsWithoutReadPermission() throws IOException {
    assertThat(getProjects(idToken(userWithOtherPermissionsToken)), hasStatus(FORBIDDEN));
  }

  @Test
  @DisplayName("can list projects with 'oidc:admin:project:read' permission")
  void shouldListProjects() throws IOException {
    // GIVEN: master realm and other realms with configured permissions, extra fields in JWT
    // and projects created in both realms
    String otherRealmName = createRealmWithStellaPermissions();

    String otherRealmClientSecret = UUID.randomUUID().toString();
    String otherRealmClientId = randomAlphanumeric(36);
    createClient(otherRealmName, otherRealmClientId, otherRealmClientSecret);

    ProjectRepresentation project1 = createRandomProject();
    ProjectRepresentation project2 = createRandomProject();

    // add projects directly to database as we can't add extra field to id token when a client is not
    // associated with a project
    Project otherRealmProject1 = addProject(otherRealmName);
    Project otherRealmProject2 = addProject(otherRealmName);
    associateClientWithPrimaryProject(otherRealmClientId, otherRealmProject1.getId(), otherRealmName);

    String masterRealmProjectReaderToken = idToken(projectReaderToken);
    String otherRealmProjectReaderToken = idToken(
        userWithPermissionToken(List.of(TestConstants.Permissions.OIDC_ADMIN_PROJECT_READ), otherRealmName, otherRealmClientId,
            otherRealmClientSecret));

    var otherRealmProject1Rep = new ProjectRepresentation(otherRealmProject1);
    var otherRealmProject2Rep = new ProjectRepresentation(otherRealmProject2);

    // WHEN: we fetch projects in master
    List<ProjectRepresentation> projects = getProjectRepresentations(masterRealmProjectReaderToken);

    // THEN: we get only projects in master
    assertThat(projects, hasItems(project1, project2));
    assertThat(projects, not(hasItems(otherRealmProject1Rep, otherRealmProject2Rep)));

    // WHEN: we fetch projects in other realm
    List<ProjectRepresentation> projectsInOtherRealm = getProjectRepresentations(otherRealmName, otherRealmProjectReaderToken);

    // THEN: we get only projects in other realm
    assertThat(projectsInOtherRealm, hasItems(otherRealmProject1Rep, otherRealmProject2Rep));
    assertThat(projectsInOtherRealm, not(hasItems(project1, project2)));
  }

  @Test
  @DisplayName("can list projects with 'oidc:superadmin:project:read' permission")
  void shouldListProjectsAsSuperAdmin() throws IOException {
    // GIVEN: master realm and other realms with configured permissions, extra fields in JWT
    // and projects created in both realms
    String otherRealmName = createRealmWithStellaPermissions();

    String otherRealmClientSecret = UUID.randomUUID().toString();
    String otherRealmClientId = randomAlphanumeric(36);
    createClient(otherRealmName, otherRealmClientId, otherRealmClientSecret);

    ProjectRepresentation project1 = createRandomProject();
    ProjectRepresentation project2 = createRandomProject();

    // add projects directly to database as we can't add extra field to id token when a client is not
    // associated with a project
    Project otherRealmProject1 = addProject(otherRealmName);
    Project otherRealmProject2 = addProject(otherRealmName);
    associateClientWithPrimaryProject(otherRealmClientId, otherRealmProject1.getId(), otherRealmName);

    String masterRealmProjectReaderToken = idToken(projectSuperAdminReaderToken);
    String otherRealmProjectReaderToken = idToken(
        userWithPermissionToken(List.of(TestConstants.Permissions.OIDC_SUPERADMIN_PROJECT_READ), otherRealmName,
            otherRealmClientId, otherRealmClientSecret));

    var otherRealmProject1Rep = new ProjectRepresentation(otherRealmProject1);
    var otherRealmProject2Rep = new ProjectRepresentation(otherRealmProject2);

    // WHEN: we fetch projects in master
    List<ProjectRepresentation> projectsFetchedViaMaster = getProjectRepresentations(masterRealmProjectReaderToken);

    // THEN: we get projects in all realms
    assertThat(projectsFetchedViaMaster, hasItems(project1, project2, otherRealmProject1Rep, otherRealmProject2Rep));

    // WHEN: we fetch projects in other realm
    List<ProjectRepresentation> projectsFetchViaOtherRealm = getProjectRepresentations(otherRealmName,
        otherRealmProjectReaderToken);

    // THEN: we get only projects in other realm
    assertThat(projectsFetchViaOtherRealm, hasItems(otherRealmProject1Rep, otherRealmProject2Rep));
    assertThat(projectsFetchViaOtherRealm, not(hasItems(project1, project2)));
  }

  protected void testSuccessfulProjectModificationUsingToken(String writerToken, String readerToken)
      throws IOException {
    ProjectRepresentation createdProject = createRandomProject();
    ProjectUpdateInputModel projectUpdateInputModel = randomProjectUpdateInputModel();
    projectUpdateInputModel.setKid(createRsaKey(MASTER_REALM_NAME));

    Response response = updateProject(createdProject.getProjectPublicId(), projectUpdateInputModel, writerToken);
    assertThat(response, hasStatus(OK));

    ProjectRepresentationWrapper updateProjectResultWrapper = JsonSerialization.readValue(response.body().string(),
        ProjectRepresentationWrapper.class);
    assertThat(updateProjectResultWrapper.getStatus(), is("ok"));
    ProjectRepresentation updateProjectResult = updateProjectResultWrapper.getDetails();

    assertThat(updateProjectResult.getName(), is(projectUpdateInputModel.getName()));
    assertThat(updateProjectResult.getDescription(), is(projectUpdateInputModel.getDescription()));
    assertThat(updateProjectResult.getKid(), is(projectUpdateInputModel.getKid()));

    ProjectRepresentation getProjectResult = getProjectRepresentation(createdProject.getProjectPublicId(), readerToken);

    assertThat(getProjectResult.getName(), is(projectUpdateInputModel.getName()));
    assertThat(getProjectResult.getDescription(), is(projectUpdateInputModel.getDescription()));
    assertThat(getProjectResult.getKid(), is(projectUpdateInputModel.getKid()));
    assertThat(getProjectResult.getRealmId(), is(MASTER_REALM_NAME));
  }

  protected ProjectUpdateInputModel toProjectUpdateInputModel(ProjectRepresentation projectRepresentation) {
    ProjectUpdateInputModel project = new ProjectUpdateInputModel();
    project.setName(projectRepresentation.getName());
    project.setDescription(projectRepresentation.getDescription());
    return project;
  }

  protected ProjectUpdateInputModel randomProjectUpdateInputModel() {
    ProjectRepresentation randomProject = randomProjectRepresentation(MASTER_REALM_NAME);
    return toProjectUpdateInputModel(randomProject);
  }

  protected String projectUrl(String realmId, UUID projectPublicId) {
    return String.format("%s/%s", projectsUrl(realmId), projectPublicId);
  }

  protected Response createProject(ProjectCreateRequest project, String token) throws IOException {
    return createProject(MASTER_REALM_NAME, project, token);
  }

  protected ProjectRepresentation createRandomProject() throws IOException {
    return createRandomProject(MASTER_REALM_NAME, idToken(projectWriterToken));
  }

  protected ProjectRepresentation createRandomProjectWithKey() throws IOException {
    return createRandomProjectWithKey(MASTER_REALM_NAME, idToken(projectWriterToken));
  }

  protected ClientRepresentation createRandomClient() {
    String clientId = randomAlphanumeric(50);
    String clientSecret = UUID.randomUUID().toString();
    return createClient(MASTER_REALM_NAME, clientId, clientSecret);
  }

  protected Response getProjectResponse(UUID projectPublicId, String token) throws IOException {
    return getProjectResponse(MASTER_REALM_NAME, projectPublicId, token);
  }

  protected Response getProjectResponse(String realmName, UUID projectPublicId, String token) throws IOException {
    return send(builderWithUrlAndToken(projectUrl(realmName, projectPublicId), token).get());
  }

  protected ProjectRepresentation getProjectRepresentation(UUID projectPublicId, String token) throws IOException {
    return new ProjectRepresentation(getExtendedProjectRepresentation(MASTER_REALM_NAME, projectPublicId, token));
  }

  protected ExtendedProjectRepresentation getExtendedProjectRepresentation(String realmName, UUID projectPublicId, String token)
      throws IOException {
    Response response = getProjectResponse(realmName, projectPublicId, token);

    assertThat(response, hasStatus(OK));
    ExtendedProjectRepresentationWrapper result = JsonSerialization.readValue(response.body().string(),
        ExtendedProjectRepresentationWrapper.class);
    assertThat(result.getStatus(), is("ok"));
    return result.getDetails();
  }

  protected Response updateProject(UUID projectPublicId, ProjectUpdateInputModel project, String token)
      throws IOException {
    RequestBody body = RequestBody.create(JSON, JsonSerialization.writeValueAsString(project));
    return send(builderWithUrlAndToken(projectUrl(MASTER_REALM_NAME, projectPublicId), token).put(body));
  }

  protected Response getProjects(String token) throws IOException {
    return send(builderWithUrlAndToken(projectsUrl(MASTER_REALM_NAME), token).get());
  }

  protected List<ProjectRepresentation> getProjectRepresentations(String token) throws IOException {
    return getProjectRepresentations(MASTER_REALM_NAME, token);
  }

  protected List<ProjectRepresentation> getProjectRepresentations(String realmName, String token) throws IOException {
    Response response = send(builderWithUrlAndToken(projectsUrl(realmName), token).get());

    assertThat(response, hasStatus(OK));

    ProjectRepresentationListWrapper result = JsonSerialization.readValue(response.body().string(),
        ProjectRepresentationListWrapper.class);
    assertThat(result.getStatus(), is("ok"));
    return result.getDetails();
  }

  protected static Stream<ProjectRepresentation> invalidProjectInputs() {
    ProjectRepresentation tooLongName = randomProjectRepresentation(MASTER_REALM_NAME);
    tooLongName.setName(randomAlphanumeric(21));
    ProjectRepresentation tooLongDescription = randomProjectRepresentation(MASTER_REALM_NAME);
    tooLongDescription.setDescription(randomAlphanumeric(256));

    return Stream.of(tooLongName, tooLongDescription);
  }

  private String randomRealmName() {
    return RandomStringUtils.randomAlphabetic(32);
  }

  private String createRealmWithStellaPermissions() {
    String otherRealmName = randomRealmName();
    createRealm(otherRealmName);
    addStellaPermissionsToRealm(otherRealmName);
    return otherRealmName;
  }
}
