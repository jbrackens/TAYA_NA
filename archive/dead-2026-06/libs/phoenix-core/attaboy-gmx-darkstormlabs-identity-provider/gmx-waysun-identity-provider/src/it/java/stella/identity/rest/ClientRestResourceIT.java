package stella.identity.rest;

import static java.util.UUID.randomUUID;
import static javax.ws.rs.core.Response.Status.*;
import static org.hamcrest.MatcherAssert.assertThat;
import static stella.identity.utils.ResponseMatcher.hasStatus;

import java.io.IOException;
import java.util.Collections;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.testcontainers.shaded.okhttp3.Response;

public class ClientRestResourceIT extends ClientRestResourceITCommon {

  @Test
  void projectWriterCannotAssociateClientAdditionalProjectUsingAccessToken() throws IOException {
    UUID publicId = randomUUID();
    Response response = assignProjectsWithClient(publicId, Collections.emptyList(), clientId,
        accessToken(projectWriterToken));

    assertThat(response, hasStatus(UNAUTHORIZED));
  }

}
