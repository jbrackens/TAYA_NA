package stella.identity.rest;

import static javax.ws.rs.core.Response.Status.UNAUTHORIZED;
import static org.hamcrest.MatcherAssert.assertThat;
import static stella.identity.utils.ResponseMatcher.hasStatus;
import static stella.identity.utils.TestUtils.randomProjectCreateRequest;

import java.io.IOException;

import org.junit.jupiter.api.Test;
import org.testcontainers.shaded.okhttp3.Response;

import stella.identity.model.ProjectRepresentation;
import stella.identity.model.ProjectUpdateInputModel;

public class ProjectRestResourceIT extends ProjectRestResourceITCommon {

  @Test
  void projectWriterCannotCreateProjectUsingAccessToken() throws IOException {
    Response response = createProject(randomProjectCreateRequest(), accessToken(projectWriterToken));

    assertThat(response, hasStatus(UNAUTHORIZED));
  }

  @Test
  void projectReaderCannotGetProjectUsingAccessToken() throws IOException {
    ProjectRepresentation createdProject = createRandomProject();

    Response response = getProjectResponse(createdProject.getProjectPublicId(), accessToken(projectReaderToken));

    assertThat(response, hasStatus(UNAUTHORIZED));
  }

  @Test
  void projectWriterCannotModifyProjectUsingAccessToken() throws IOException {
    ProjectRepresentation createdProject = createRandomProject();

    ProjectUpdateInputModel projectUpdateInputModel = randomProjectUpdateInputModel();

    Response response = updateProject(createdProject.getProjectPublicId(), projectUpdateInputModel,
        accessToken(projectWriterToken));

    assertThat(response, hasStatus(UNAUTHORIZED));
  }

  @Test
  void projectReaderCannotListProjectsUsingAccessToken() throws IOException {
    assertThat(getProjects(accessToken(projectReaderToken)), hasStatus(UNAUTHORIZED));
  }

}
