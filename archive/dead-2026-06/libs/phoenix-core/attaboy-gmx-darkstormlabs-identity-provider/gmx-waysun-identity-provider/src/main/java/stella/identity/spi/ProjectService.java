package stella.identity.spi;

import java.util.List;
import java.util.UUID;

import org.keycloak.provider.Provider;

import stella.identity.exception.ProjectPublicIdNotFound;
import stella.identity.jpa.ClientProjectDTO;
import stella.identity.model.ExtendedProjectRepresentation;
import stella.identity.model.ProjectRepresentation;
import stella.identity.model.ProjectUpdateInputModel;

public interface ProjectService extends Provider {

  List<ProjectRepresentation> listProjects(boolean findInAllRealms);

  ProjectRepresentation findProject(UUID projectPublicId);

  ExtendedProjectRepresentation findProjectWithClients(UUID projectPublicId, boolean findInAllRealms);

  ProjectRepresentation addProject(ProjectRepresentation project);

  ProjectRepresentation updateProject(UUID projectPublicId, ProjectUpdateInputModel project);

  ProjectRepresentation findPrimaryProjectByClientId(String clientId) throws ProjectPublicIdNotFound;

  List<ClientProjectDTO> findAllProjectsByClientId(String clientId);

  void associateProjectsToClient(String clientId, UUID primaryProjectPublicId, List<UUID> additionalProjectPublicIds);
}
