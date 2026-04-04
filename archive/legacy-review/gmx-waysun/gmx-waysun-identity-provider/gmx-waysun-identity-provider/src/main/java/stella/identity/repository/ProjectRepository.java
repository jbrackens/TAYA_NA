package stella.identity.repository;

import java.util.List;
import java.util.stream.Collectors;

import javax.persistence.NoResultException;

import org.keycloak.models.KeycloakSession;

import stella.identity.exception.ProjectPublicIdNotFound;
import stella.identity.jpa.ClientProject;
import stella.identity.jpa.ClientProjectDTO;
import stella.identity.jpa.Project;
import stella.identity.model.AssociatedClients;
import stella.identity.model.ClientInfo;

public class ProjectRepository extends RepositoryBase {

  public ProjectRepository(KeycloakSession session) {
    super(session);
  }

  public Project findPrimaryProjectByClientId(String clientDbId) throws ProjectPublicIdNotFound {
    try {
      return getEntityManager().createNamedQuery(ClientProject.FIND_PRIMARY_BY_CLIENT_ID, Project.class)
          .setParameter(ClientProject.CLIENT_ID, clientDbId)
          .getSingleResult();
    } catch (NoResultException e) {
      throw new ProjectPublicIdNotFound(clientDbId, e);
    }
  }

  public List<Project> findAdditionalProjectsByClientId(String clientDbId) {
    return getEntityManager().createNamedQuery(ClientProject.FIND_ADDITIONAL_BY_CLIENT_ID, Project.class)
        .setParameter(ClientProject.CLIENT_ID, clientDbId)
        .getResultList();
  }

  public List<ClientProjectDTO> findAllProjectsByClientId(String clientDbId) {
    List<Object[]> result = getEntityManager().createNamedQuery(ClientProject.FIND_All_BY_CLIENT_ID)
        .setParameter(ClientProject.CLIENT_ID, clientDbId)
        .getResultList();

    return result.stream().map(entry -> {
      Project project = (Project) entry[0];
      ClientProject clientProject = (ClientProject) entry[1];
      return new ClientProjectDTO(clientProject, project);
    }).collect(Collectors.toList());
  }

  public AssociatedClients findAllAssociatedClientsByProjectId(Long projectId) {
    List<Object[]> result = getEntityManager().createNamedQuery(ClientProject.FIND_All_BY_PROJECT_ID)
        .setParameter(ClientProject.PROJECT_ID, projectId)
        .getResultList();

    List<ClientInfo> primary = result.stream()
        .filter(entry -> (boolean) entry[3])
        .map(entry -> new ClientInfo((String) entry[0], (String) entry[1], (String) entry[2]))
        .collect(Collectors.toList());
    List<ClientInfo> additional = result.stream()
        .filter(entry -> !(boolean) entry[3])
        .map(entry -> new ClientInfo((String) entry[0], (String) entry[1], (String) entry[2]))
        .collect(Collectors.toList());
    return new AssociatedClients(primary, additional);
  }
}
