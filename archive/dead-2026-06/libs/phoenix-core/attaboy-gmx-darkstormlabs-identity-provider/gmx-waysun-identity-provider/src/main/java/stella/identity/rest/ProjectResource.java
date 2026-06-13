package stella.identity.rest;

import java.util.List;
import java.util.UUID;

import javax.ws.rs.*;
import javax.ws.rs.core.*;

import org.jboss.resteasy.annotations.cache.NoCache;

import org.keycloak.models.KeycloakSession;

import stella.identity.Permissions;
import stella.identity.auth.AuthResult;
import stella.identity.model.ExtendedProjectRepresentation;
import stella.identity.model.ProjectCreateRequest;
import stella.identity.model.ProjectRepresentation;
import stella.identity.model.ProjectUpdateInputModel;
import stella.identity.rest.responses.ExtendedProjectRepresentationWrapper;
import stella.identity.rest.responses.ProjectRepresentationListWrapper;
import stella.identity.rest.responses.ProjectRepresentationWrapper;
import stella.identity.spi.ProjectService;

public class ProjectResource extends BaseResource implements RequestCorrelationIdSupport {

  private static final String MASTER_REALM_ID = "master";

  public ProjectResource(KeycloakSession session, AuthResult authResult) {
    super(session, authResult);
  }

  @GET
  @NoCache
  @Produces(MediaType.APPLICATION_JSON)
  public ProjectRepresentationListWrapper getProjects(@Context final HttpHeaders headers) {
    return withLogCorrelationId(headers, () -> {
      boolean isSuperAdmin = hasPermission(Permissions.OIDC_SUPERADMIN_PROJECT_READ);
      if (!isSuperAdmin)
        checkPermissionOrFail(Permissions.OIDC_ADMIN_PROJECT_READ);
      boolean findInAllRealms = isSuperAdmin && isMasterRealm();
      List<ProjectRepresentation> projects = projectService().listProjects(findInAllRealms);
      return ProjectRepresentationListWrapper.asSuccess(projects);
    });
  }

  @POST
  @NoCache
  @Consumes(MediaType.APPLICATION_JSON)
  @Produces(MediaType.APPLICATION_JSON)
  public Response createProject(@Context final HttpHeaders headers, @Context final UriInfo uriInfo,
      ProjectCreateRequest request) {
    return withLogCorrelationId(headers, () -> {
      checkPermissionOrFail(Permissions.OIDC_ADMIN_PROJECT_WRITE);
      String currentRealmId = session.getContext().getRealm().getId();
      ProjectRepresentation createdProject = projectService().addProject(new ProjectRepresentation(request, currentRealmId));
      return Response.created(
          session.getContext()
              .getUri()
              .getAbsolutePathBuilder()
              .path(createdProject.getProjectPublicId().toString())
              .build())
          .build();
    });
  }

  @GET
  @NoCache
  @Path("{projectPublicId}")
  @Produces(MediaType.APPLICATION_JSON)
  public ExtendedProjectRepresentationWrapper getProject(@Context final HttpHeaders headers,
      @PathParam("projectPublicId") final UUID projectPublicId) {
    return withLogCorrelationId(headers, () -> {
      boolean isSuperAdmin = hasPermission(Permissions.OIDC_SUPERADMIN_PROJECT_READ);
      if (!isSuperAdmin)
        checkPermissionOrFail(Permissions.OIDC_ADMIN_PROJECT_READ);
      boolean findInAllRealms = isSuperAdmin && isMasterRealm();
      ExtendedProjectRepresentation project = projectService().findProjectWithClients(projectPublicId, findInAllRealms);
      return ExtendedProjectRepresentationWrapper.asSuccess(project);
    });
  }

  @PUT
  @NoCache
  @Path("{projectPublicId}")
  @Consumes(MediaType.APPLICATION_JSON)
  @Produces(MediaType.APPLICATION_JSON)
  public ProjectRepresentationWrapper updateProject(@Context final HttpHeaders headers,
      @PathParam("projectPublicId") final UUID projectPublicId, ProjectUpdateInputModel project) {
    return withLogCorrelationId(headers, () -> {
      checkPermissionOrFail(Permissions.OIDC_ADMIN_PROJECT_WRITE);
      ProjectRepresentation updatedProject = projectService().updateProject(projectPublicId, project);
      return ProjectRepresentationWrapper.asSuccess(updatedProject);
    });
  }

  private ProjectService projectService() {
    return session.getProvider(ProjectService.class);
  }

  private boolean isMasterRealm() {
    return MASTER_REALM_ID.equals(session.getContext().getRealm().getId());
  }
}
