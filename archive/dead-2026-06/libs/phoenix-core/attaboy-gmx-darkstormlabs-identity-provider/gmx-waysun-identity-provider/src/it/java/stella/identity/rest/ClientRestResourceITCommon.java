package stella.identity.rest;

import static java.util.UUID.randomUUID;
import static javax.ws.rs.core.Response.Status.*;
import static org.apache.commons.lang.RandomStringUtils.randomAlphanumeric;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.is;
import static stella.identity.utils.ResponseMatcher.hasStatus;
import static stella.identity.utils.TestUtils.EMPTY_REQUEST_BODY;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.apache.commons.lang.RandomStringUtils;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.shaded.okhttp3.Request;
import org.testcontainers.shaded.okhttp3.RequestBody;
import org.testcontainers.shaded.okhttp3.Response;

import org.keycloak.representations.AccessTokenResponse;
import org.keycloak.util.JsonSerialization;

import stella.identity.TestConstants;
import stella.identity.jpa.ClientProject;
import stella.identity.jpa.Project;
import stella.identity.model.ClientProjectsRequest;
import stella.identity.model.ProjectRepresentation;

public abstract class ClientRestResourceITCommon extends RestResourceTestBase {

  protected final String realmName = "master";
  protected String clientId;
  private String clientDbId;
  private String clientSecret;
  protected AccessTokenResponse userWithOtherPermissionsToken;
  protected AccessTokenResponse projectReaderToken;
  protected AccessTokenResponse projectWriterToken;

  @BeforeAll
  void before() {
    clientSecret = UUID.randomUUID().toString();
    clientId = randomAlphanumeric(36);
    Project preexistingProject = addProject(realmName);
    createClient(realmName, clientId, clientSecret);
    clientDbId = getClient(realmName, clientId).getId();
    associateClientWithPrimaryProject(clientId, preexistingProject.getId(), realmName);

    addStellaPermissionsToRealm(realmName);

    List<String> allNotProjectPermissions = stellaPermissions.stream().filter(p -> !p.startsWith("oidc:admin:project"))
        .collect(Collectors.toList());
    userWithOtherPermissionsToken = userWithPermissionToken(allNotProjectPermissions, realmName, clientId,
        clientSecret);

    projectReaderToken = userWithPermissionToken(List.of(TestConstants.Permissions.OIDC_ADMIN_PROJECT_READ), realmName,
        clientId,
        clientSecret);

    projectWriterToken = userWithPermissionToken(List.of(TestConstants.Permissions.OIDC_ADMIN_PROJECT_WRITE), realmName,
        clientId,
        clientSecret);
  }

  @Test
  void cannotAssociateClientProjectIfTokenNotProvided() throws IOException {
    String publicId = randomUUID().toString();
    Request.Builder builder = new Request.Builder().url(associateClientUrl(publicId)).put(EMPTY_REQUEST_BODY);

    assertThat(send(builder), hasStatus(UNAUTHORIZED));
  }

  @Test
  void otherRealmUserAssociatorCannotAssociateClientProject() throws IOException {
    UUID publicId = randomUUID();

    String otherRealm = RandomStringUtils.randomAlphanumeric(20);
    createRealm(otherRealm);
    Project project = addProject(otherRealm);
    String clientSecret = UUID.randomUUID().toString();
    String clientId = randomAlphanumeric(36);
    createClient(otherRealm, clientId, clientSecret);
    associateClientWithPrimaryProject(clientId, project.getId(), otherRealm);

    addStellaPermissionsToRealm(otherRealm);

    AccessTokenResponse token = userWithPermissionToken(List.of(TestConstants.Permissions.OIDC_ADMIN_PROJECT_WRITE),
        otherRealm, clientId, clientSecret);

    assertThat(assignProjectsWithClient(publicId, Collections.emptyList(), clientId, idToken(token)),
        hasStatus(UNAUTHORIZED));
    assertThat(assignProjectsWithClient(publicId, Collections.emptyList(), clientId, accessToken(token)),
        hasStatus(UNAUTHORIZED));
  }

  @Test
  @DisplayName("cannot associate client to project without 'oidc:admin:project:write' permission")
  void cannotAssociateClientProjectWithoutWritePermission() throws IOException {
    UUID publicId = randomUUID();
    Response response = assignProjectsWithClient(publicId, Collections.emptyList(), clientId,
        idToken(userWithOtherPermissionsToken));

    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  void successfullyAssociateClientWithProjects() throws IOException {
    UUID primaryProjectPublicId = createRandomProject().getProjectPublicId();
    UUID additionalProject1PublicId = createRandomProject().getProjectPublicId();
    UUID additionalProject2PublicId = createRandomProject().getProjectPublicId();

    Response response = assignProjectsWithClient(primaryProjectPublicId,
        List.of(additionalProject1PublicId, additionalProject2PublicId), clientId, idToken(projectWriterToken));

    assertThat(response, hasStatus(NO_CONTENT));
    assertClientProjectMappings(clientDbId, primaryProjectPublicId,
        Set.of(additionalProject1PublicId, additionalProject2PublicId));
  }

  @Test
  void successfullyAssociateClientWithProjectsWhenNoAdditionalProjectsRequested() throws IOException {
    UUID primaryProjectPublicId = createRandomProject().getProjectPublicId();

    Response response = assignProjectsWithClient(primaryProjectPublicId, Collections.emptyList(), clientId,
        idToken(projectWriterToken));

    assertThat(response, hasStatus(NO_CONTENT));
    assertClientProjectMappings(clientDbId, primaryProjectPublicId, Collections.emptySet());
  }

  @Test
  void successfullyAssociateClientWithProjectsMultipleTimes() throws IOException {
    UUID primaryProjectPublicId = createRandomProject().getProjectPublicId();
    UUID additionalProject1PublicId = createRandomProject().getProjectPublicId();
    UUID additionalProject2PublicId = createRandomProject().getProjectPublicId();
    UUID otherPrimaryProjectPublicId = createRandomProject().getProjectPublicId();
    UUID otherAdditionalProject1PublicId = createRandomProject().getProjectPublicId();
    UUID otherAdditionalProject2PublicId = createRandomProject().getProjectPublicId();

    // initial project mapping request
    Response response = assignProjectsWithClient(primaryProjectPublicId,
        List.of(additionalProject1PublicId, additionalProject2PublicId), clientId, idToken(projectWriterToken));

    assertThat(response, hasStatus(NO_CONTENT));
    assertClientProjectMappings(clientDbId, primaryProjectPublicId,
        Set.of(additionalProject1PublicId, additionalProject2PublicId));

    // update the project mappings with a new request
    Response response2 = assignProjectsWithClient(otherPrimaryProjectPublicId,
        List.of(otherAdditionalProject1PublicId, otherAdditionalProject2PublicId), clientId, idToken(projectWriterToken));

    assertThat(response2, hasStatus(NO_CONTENT));
    assertClientProjectMappings(clientDbId, otherPrimaryProjectPublicId,
        Set.of(otherAdditionalProject1PublicId, otherAdditionalProject2PublicId));

    // update the project mappings with a new request, moving primary to additional
    Response response3 = assignProjectsWithClient(primaryProjectPublicId,
        List.of(otherPrimaryProjectPublicId), clientId, idToken(projectWriterToken));

    assertThat(response3, hasStatus(NO_CONTENT));
    assertClientProjectMappings(clientDbId, primaryProjectPublicId, Set.of(otherPrimaryProjectPublicId));
  }

  @Test
  void failAssociateClientWithProjectsWhenProjectDoesNotExist() throws IOException {
    UUID primaryProjectPublicId = createRandomProject().getProjectPublicId();
    UUID additionalProject1PublicId = createRandomProject().getProjectPublicId();
    UUID additionalProject2PublicId = createRandomProject().getProjectPublicId();
    UUID nonexistentPrimaryProjectPublicId = UUID.randomUUID();

    // initial project mapping request
    Response response = assignProjectsWithClient(primaryProjectPublicId,
        List.of(additionalProject1PublicId, additionalProject2PublicId), clientId, idToken(projectWriterToken));

    assertThat(response, hasStatus(NO_CONTENT));
    assertClientProjectMappings(clientDbId, primaryProjectPublicId,
        Set.of(additionalProject1PublicId, additionalProject2PublicId));

    // fail the request and keep the original mappings
    Response response2 = assignProjectsWithClient(nonexistentPrimaryProjectPublicId,
        List.of(additionalProject1PublicId, additionalProject2PublicId), clientId, idToken(projectWriterToken));

    assertThat(response2, hasStatus(NOT_FOUND));
    assertClientProjectMappings(clientDbId, primaryProjectPublicId,
        Set.of(additionalProject1PublicId, additionalProject2PublicId));
  }

  @Test
  void failAssociateClientWithProjectsWhenClientDoesNotExist() throws IOException {
    UUID primaryProjectPublicId = createRandomProject().getProjectPublicId();
    String nonExistentClientId = UUID.randomUUID().toString();

    Response response = assignProjectsWithClient(primaryProjectPublicId, Collections.emptyList(), nonExistentClientId,
        idToken(projectWriterToken));

    assertThat(response, hasStatus(NOT_FOUND));
  }

  @Test
  void failAssociateClientWithProjectsWhenPrimaryProjectAlsoIncludedInAdditional() throws IOException {
    UUID primaryProjectPublicId = createRandomProject().getProjectPublicId();
    UUID additionalProject1PublicId = createRandomProject().getProjectPublicId();
    UUID additionalProject2PublicId = createRandomProject().getProjectPublicId();

    Response response = assignProjectsWithClient(primaryProjectPublicId,
        List.of(additionalProject1PublicId, additionalProject2PublicId, primaryProjectPublicId), clientId,
        idToken(projectWriterToken));

    assertThat(response, hasStatus(BAD_REQUEST));
  }

  @Test
  void successfullyAssociateClientWithProjectsWhenAdditionalProjectsIncludesDuplicates() throws IOException {
    UUID primaryProjectPublicId = createRandomProject().getProjectPublicId();
    UUID additionalProject1PublicId = createRandomProject().getProjectPublicId();

    Response response = assignProjectsWithClient(primaryProjectPublicId,
        List.of(additionalProject1PublicId, additionalProject1PublicId), clientId,
        idToken(projectWriterToken));

    assertThat(response, hasStatus(NO_CONTENT));
    assertClientProjectMappings(clientDbId, primaryProjectPublicId, Set.of(additionalProject1PublicId));
  }

  protected Response assignProjectsWithClient(UUID primaryProjectPublicId, List<UUID> additionalProjectPublicIds,
      String clientId, String token)
      throws IOException {
    return send(builderWithUrlAndToken(associateClientUrl(clientId), token)
        .put(RequestBody.create(JSON,
            JsonSerialization
                .writeValueAsString(new ClientProjectsRequest(primaryProjectPublicId, additionalProjectPublicIds)))));
  }

  private String associateClientUrl(String clientId) {
    return String.format("%s/%s/projects", clientsUrl(), clientId);
  }

  private String clientsUrl() {
    return this.clientsUrl(realmName);
  }

  protected ProjectRepresentation createRandomProject() throws IOException {
    return createRandomProject(realmName, idToken(projectWriterToken));
  }

  private void assertClientProjectMappings(String clientDbId, UUID expectedPrimaryProjectPublicId,
      Set<UUID> expectedAdditionalProjectPublicIds) {
    runInTransaction(() -> {
      Project primaryProject = entityManager
          .createNamedQuery(ClientProject.FIND_PRIMARY_BY_CLIENT_ID, Project.class)
          .setParameter(ClientProject.CLIENT_ID, clientDbId)
          .getSingleResult();

      List<Project> additionalProjects = entityManager
          .createNamedQuery(ClientProject.FIND_ADDITIONAL_BY_CLIENT_ID, Project.class)
          .setParameter(ClientProject.CLIENT_ID, clientDbId)
          .getResultList();

      assertThat(primaryProject.getProjectPublicId(), is(expectedPrimaryProjectPublicId));
      assertThat(additionalProjects.stream().map(Project::getProjectPublicId).collect(Collectors.toList()),
          containsInAnyOrder(expectedAdditionalProjectPublicIds.toArray()));
    });
  }

}
