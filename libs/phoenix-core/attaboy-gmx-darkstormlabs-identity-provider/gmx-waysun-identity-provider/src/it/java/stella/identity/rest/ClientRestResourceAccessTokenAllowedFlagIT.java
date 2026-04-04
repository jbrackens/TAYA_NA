package stella.identity.rest;

import static javax.ws.rs.core.Response.Status.NO_CONTENT;
import static org.hamcrest.MatcherAssert.assertThat;
import static stella.identity.utils.ResponseMatcher.hasStatus;

import java.io.IOException;
import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.testcontainers.shaded.okhttp3.Response;

import org.keycloak.representations.idm.ClientRepresentation;

import stella.identity.model.ProjectRepresentation;

class ClientRestResourceAccessTokenAllowedFlagIT extends ClientRestResourceITCommon {

  @Override
  protected Boolean allowAccessTokenAuthenticationEnvVariable() {
    return true;
  }

  @Test
  void projectWriterCanAssociateClientProjectUsingAccessToken() throws IOException {
    ProjectRepresentation project = createRandomProject();
    ClientRepresentation client = createRandomClient(realmName);
    Response response = assignProjectsWithClient(project.getProjectPublicId(), Collections.emptyList(),
        client.getClientId(), accessToken(projectWriterToken));

    assertThat(response, hasStatus(NO_CONTENT));
  }

}
