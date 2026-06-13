package stella.identity.rest;

import java.security.PrivateKey;
import java.util.Optional;
import java.util.UUID;

import javax.ws.rs.*;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;

import org.jboss.logging.Logger;

import org.keycloak.crypto.Algorithm;
import org.keycloak.crypto.KeyWrapper;
import org.keycloak.models.KeycloakSession;

import stella.identity.Permissions;
import stella.identity.auth.AuthResult;
import stella.identity.exception.ProjectPublicIdNotFound;
import stella.identity.model.SignatureRequest;
import stella.identity.rest.responses.SignatureResponseWrapper;
import stella.identity.spi.PayloadSigningService;
import stella.identity.spi.ProjectService;

public class AdminResource extends BaseResource implements RequestCorrelationIdSupport {

  private static final Logger logger = Logger.getLogger(AdminResource.class);

  public AdminResource(KeycloakSession session, AuthResult authResult) {
    super(session, authResult);
  }

  @POST
  @Consumes(MediaType.APPLICATION_JSON)
  @Produces(MediaType.APPLICATION_JSON)
  @Path("sign")
  public SignatureResponseWrapper sign(@Context final HttpHeaders headers, SignatureRequest request) {
    return withLogCorrelationId(headers, () -> {
      checkPermissionOrFail(Permissions.OIDC_ADMIN_SIGN);
      String kid = getProjectKid(Optional.empty());
      PrivateKey key = getPrivateKey(kid);
      String signature = session.getProvider(PayloadSigningService.class).sign(request.getPayload(), key);
      return SignatureResponseWrapper.asSuccess(signature);
    });
  }

  @POST
  @Consumes(MediaType.APPLICATION_JSON)
  @Produces(MediaType.APPLICATION_JSON)
  @Path("sign/for/{projectPublicId}")
  public SignatureResponseWrapper sign(@Context final HttpHeaders headers,
      @PathParam("projectPublicId") final UUID projectPublicId,
      SignatureRequest request) {
    return withLogCorrelationId(headers, () -> {
      checkIfHasSignBehalfOfPermissionOrFail();
      String kid = getProjectKid(Optional.of(projectPublicId));
      checkPermissionOrFail(Permissions.signBehalfOfPermission(kid));
      PrivateKey key = getPrivateKey(kid);
      String signature = session.getProvider(PayloadSigningService.class).sign(request.getPayload(), key);
      return SignatureResponseWrapper.asSuccess(signature);
    });
  }

  private String getProjectKid(Optional<UUID> projectPublicIdOpt) {
    ProjectService projectService = session.getProvider(ProjectService.class);
    try {
      UUID projectPublicId = projectPublicIdOpt
          .orElse(projectService.findPrimaryProjectByClientId(authResult.getClientId()).getProjectPublicId());
      String kid = projectService.findProject(projectPublicId).getKid();
      if (kid == null || kid.isBlank()) {
        logger.debugv("Project {0} does not have key assigned", projectPublicId);
        throw new ForbiddenException();
      }
      return kid;
    } catch (ProjectPublicIdNotFound projectPublicIdNotFound) {
      String message = String.format("Client %s is not associated with any project", authResult.getClientId());
      logger.debug(message);
      throw new BadRequestException(message);
    }
  }

  private PrivateKey getPrivateKey(String kid) {
    KeyWrapper keyWrapper = session.keys()
        .getKeysStream(session.getContext().getRealm())
        .filter(key -> key.getKid().equals(kid) && key.getAlgorithm().equals(Algorithm.RS256))
        .findFirst()
        .orElseThrow(() -> {
          logger.debugv("Key {0} not found", kid);
          return new BadRequestException("Key not found");
        });
    return (PrivateKey) keyWrapper.getPrivateKey();
  }
}
