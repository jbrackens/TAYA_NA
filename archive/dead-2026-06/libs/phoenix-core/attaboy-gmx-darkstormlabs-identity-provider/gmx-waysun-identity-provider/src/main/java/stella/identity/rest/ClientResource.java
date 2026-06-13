package stella.identity.rest;

import java.util.Collections;

import javax.ws.rs.*;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.jboss.resteasy.annotations.cache.NoCache;

import org.keycloak.models.KeycloakSession;

import stella.identity.Permissions;
import stella.identity.auth.AuthResult;
import stella.identity.model.ClientProjectsRequest;
import stella.identity.spi.ProjectService;

public class ClientResource extends BaseResource implements RequestCorrelationIdSupport {

  public ClientResource(KeycloakSession session, AuthResult authResult) {
    super(session, authResult);
  }

  @PUT
  @NoCache
  @Consumes(MediaType.APPLICATION_JSON)
  @Produces(MediaType.APPLICATION_JSON)
  @Path("{clientId}/projects")
  public Response associateClientWithProjects(@Context final HttpHeaders headers, @PathParam("clientId") final String clientId,
      ClientProjectsRequest request) {
    return withLogCorrelationId(headers, () -> {
      checkPermissionOrFail(Permissions.OIDC_ADMIN_PROJECT_WRITE);
      projectService().associateProjectsToClient(clientId, request.getPrimaryProject(),
          request.getAdditionalProjects() == null ? Collections.emptyList() : request.getAdditionalProjects());
      return Response.noContent().build();
    });
  }

  private ProjectService projectService() {
    return session.getProvider(ProjectService.class);
  }

}
