package stella.identity.rest;

import static javax.ws.rs.core.Response.Status.CREATED;
import static javax.ws.rs.core.Response.Status.OK;
import static org.hamcrest.CoreMatchers.hasItems;
import static org.hamcrest.MatcherAssert.assertThat;
import static stella.identity.utils.ResponseMatcher.hasStatus;
import static stella.identity.utils.TestUtils.randomProjectCreateRequest;

import java.io.IOException;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.shaded.okhttp3.Response;

import stella.identity.model.ProjectCreateRequest;
import stella.identity.model.ProjectRepresentation;

class ProjectRestResourceAccessTokenAllowedFlagIT extends ProjectRestResourceITCommon {

  @Override
  protected Boolean allowAccessTokenAuthenticationEnvVariable() {
    return true;
  }

  @Test
  @DisplayName("can create project with 'oidc:admin:project:write' permission using access token if ALLOW_ACCESS_TOKEN_AUTHORIZATION is set")
  void projectWriterCanCreateProjectUsingAccessToken() throws IOException {
    ProjectCreateRequest request = randomProjectCreateRequest();
    request.setKid(null);
    Response response = createProject(request, accessToken(projectWriterToken));

    assertThat(response, hasStatus(CREATED));
  }

  @Test
  void projectReaderCanGetProjectUsingAccessToken() throws IOException {
    ProjectRepresentation createdProject = createRandomProject();

    Response response = getProjectResponse(createdProject.getProjectPublicId(), accessToken(projectReaderToken));

    assertThat(response, hasStatus(OK));
  }

  @Test
  void projectWriterCanModifyProjectUsingAccessToken() throws IOException {
    testSuccessfulProjectModificationUsingToken(accessToken(projectWriterToken), accessToken(projectReaderToken));
  }

  @Test
  void projectReaderCanListProjectsUsingAccessToken() throws IOException {
    ProjectRepresentation project1 = createRandomProject();
    ProjectRepresentation project2 = createRandomProject();

    List<ProjectRepresentation> projects = getProjectRepresentations(accessToken(projectReaderToken));

    assertThat(projects, hasItems(project1, project2));
  }

}
