package stella.identity.spi.impl;

import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.BadRequestException;

import com.google.common.annotations.VisibleForTesting;
import org.apache.commons.collections4.CollectionUtils;

import org.keycloak.connections.jpa.JpaConnectionProvider;
import org.keycloak.crypto.KeyWrapper;
import org.keycloak.models.ClientModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.ModelDuplicateException;
import org.keycloak.models.ModelException;
import org.keycloak.models.RealmModel;

import stella.identity.exception.ClientNotFound;
import stella.identity.exception.MissingRequiredParamException;
import stella.identity.exception.ProjectAlreadyAssociated;
import stella.identity.exception.ProjectAlreadyExists;
import stella.identity.exception.ProjectNotFound;
import stella.identity.exception.ProjectPublicIdNotFound;
import stella.identity.jpa.ClientProject;
import stella.identity.jpa.ClientProjectDTO;
import stella.identity.jpa.Project;
import stella.identity.model.AssociatedClients;
import stella.identity.model.ExtendedProjectRepresentation;
import stella.identity.model.ProjectRepresentation;
import stella.identity.model.ProjectUpdateInputModel;
import stella.identity.repository.ProjectRepository;
import stella.identity.spi.ProjectService;

public class ProjectServiceImpl implements ProjectService {

  private final KeycloakSession session;
  private final ProjectRepository projectRepository;

  public ProjectServiceImpl(KeycloakSession session) {
    this.session = session;
    this.projectRepository = new ProjectRepository(session);
    if (getRealm() == null) {
      throw new IllegalStateException(
          "The service cannot accept a session without a realm in its context.");
    }
  }

  private EntityManager getEntityManager() {
    return session.getProvider(JpaConnectionProvider.class).getEntityManager();
  }

  protected RealmModel getRealm() {
    return session.getContext().getRealm();
  }

  @Override
  public List<ProjectRepresentation> listProjects(boolean findInAllRealms) {
    List<Project> projectEntities = getProjects(findInAllRealms);

    List<ProjectRepresentation> result = new LinkedList<>();
    for (Project project : projectEntities) {
      result.add(new ProjectRepresentation(project));
    }
    return result;
  }

  @Override
  public ProjectRepresentation findProject(UUID projectPublicId) {
    return new ProjectRepresentation(getProject(projectPublicId, /* findInAllRealms= */ false));
  }

  @Override
  public ExtendedProjectRepresentation findProjectWithClients(UUID projectPublicId, boolean findInAllRealms) {
    Project project = getProject(projectPublicId, findInAllRealms);
    AssociatedClients associatedClients = projectRepository.findAllAssociatedClientsByProjectId(project.getId());
    return new ExtendedProjectRepresentation(project, associatedClients);
  }

  @Override
  public ProjectRepresentation addProject(ProjectRepresentation project) {
    validateProjectInput(project);
    try {
      getEntityManager().persist(project.toProjectWithoutId());
    } catch (ModelDuplicateException e) {
      throw new ProjectAlreadyExists();
    } catch (ModelException me) {
      throw new BadRequestException("Cannot create project");
    }
    return project;
  }

  @Override
  public ProjectRepresentation updateProject(UUID projectPublicId, ProjectUpdateInputModel project) {
    validateNameInput(project.getName());
    validateKidInput(project.getKid(), projectPublicId);
    Project entity = getProject(projectPublicId);
    entity.setName(project.getName());
    entity.setDescription(project.getDescription());
    entity.setKid(project.getKid());
    try {
      getEntityManager().flush();
    } catch (ModelException me) {
      throw new BadRequestException("Cannot modify project");
    }
    return new ProjectRepresentation(entity);
  }

  @Override
  public ProjectRepresentation findPrimaryProjectByClientId(String clientId) throws ProjectPublicIdNotFound {
    ClientModel client = getClient(clientId);
    Project primaryProject = projectRepository.findPrimaryProjectByClientId(client.getId());
    return new ProjectRepresentation(primaryProject);
  }

  @Override
  public List<ClientProjectDTO> findAllProjectsByClientId(String clientId) {
    ClientModel client = getClient(clientId);
    return projectRepository.findAllProjectsByClientId(client.getId());
  }

  @Override
  public void associateProjectsToClient(String clientId, UUID primaryProjectPublicId, List<UUID> additionalProjectPublicIds) {
    ClientModel client = getClient(clientId);
    Set<UUID> uniqueAdditionalProjectPublicIds = new HashSet<>(additionalProjectPublicIds);
    validateAssociatedProjects(primaryProjectPublicId, uniqueAdditionalProjectPublicIds);

    Optional<Project> primaryProjectToAssociate = removeAssociatedPrimaryProjectFromClientAndFetchNew(client.getId(),
        primaryProjectPublicId);
    primaryProjectToAssociate.ifPresent(project -> addAssociatedProjectToClient(client.getId(), project, true));

    List<Project> additionalProjectsToAssociate = removeAssociatedAdditionalProjectFromClientAndFetchNew(client.getId(),
        uniqueAdditionalProjectPublicIds);
    additionalProjectsToAssociate.forEach(project -> addAssociatedProjectToClient(client.getId(), project, false));
  }

  private void validateAssociatedProjects(UUID primaryProjectPublicId, Set<UUID> additionalProjectPublicIds)
      throws BadRequestException {
    if (additionalProjectPublicIds.contains(primaryProjectPublicId)) {
      throw new BadRequestException("The primary associated project cannot be included in additional projects");
    }
  }

  private Optional<Project> removeAssociatedPrimaryProjectFromClientAndFetchNew(String clientDbId,
      UUID primaryProjectPublicId) {
    Optional<Project> existingPrimaryProject = getEntityManager()
        .createNamedQuery(ClientProject.FIND_PRIMARY_BY_CLIENT_ID, Project.class)
        .setParameter(ClientProject.CLIENT_ID, clientDbId)
        .getResultList()
        .stream()
        .findFirst();

    if (existingPrimaryProject.isPresent()) {
      if (!existingPrimaryProject.get().getProjectPublicId().equals(primaryProjectPublicId)) {
        // we have a primary project already and it's different, disassociate it
        deleteClientProjectMapping(clientDbId, existingPrimaryProject.get().getId());
        return Optional.of(getProject(primaryProjectPublicId));
      } else {
        return Optional.empty();
      }
    } else {
      return Optional.of(getProject(primaryProjectPublicId));
    }
  }

  private void deleteClientProjectMapping(String clientDbId, Long projectId) {
    getEntityManager()
        .createNamedQuery(ClientProject.DELETE_BY_CLIENT_ID_PROJECT_ID)
        .setParameter(ClientProject.CLIENT_ID, clientDbId)
        .setParameter(ClientProject.PROJECT_ID, projectId)
        .executeUpdate();
  }

  private List<Project> removeAssociatedAdditionalProjectFromClientAndFetchNew(String clientDbId,
      Set<UUID> additionalProjectPublicIds) {
    List<Project> existingAdditionalProjects = projectRepository.findAdditionalProjectsByClientId(clientDbId);
    Set<UUID> existingAssociatedProjectPublicIds = existingAdditionalProjects.stream().map(Project::getProjectPublicId)
        .collect(Collectors.toSet());
    // delete existing additional project mappings
    for (Project existingProject : existingAdditionalProjects) {
      if (!additionalProjectPublicIds.contains(existingProject.getProjectPublicId())) {
        deleteClientProjectMapping(clientDbId, existingProject.getId());
      }
    }

    // fetch projects to be added to the additional projects list
    Collection<UUID> mappingsToCreated = CollectionUtils.subtract(additionalProjectPublicIds,
        existingAssociatedProjectPublicIds);
    return mappingsToCreated.stream().map(this::getProject).collect(Collectors.toList());
  }

  protected void addAssociatedProjectToClient(String clientDbId, Project project, boolean primary) {
    try {
      getEntityManager().persist(new ClientProject(clientDbId, project.getId(), primary));
    } catch (ModelDuplicateException e) {
      throw new ProjectAlreadyAssociated(project.getProjectPublicId());
    }
  }

  @Override
  public void close() {}

  @VisibleForTesting
  Project getProject(UUID projectPublicId) {
    return getProject(projectPublicId, /* findInAllRealms= */ false);
  }

  @VisibleForTesting
  Project getProject(UUID projectPublicId, boolean findInAllRealms) {
    List<Project> projects = findInAllRealms
        ? getProjectsByIdInAllRealms(projectPublicId)
        : getProjectsByIdInCurrentRealm(projectPublicId);
    if (projects.isEmpty()) {
      throw new ProjectNotFound(projectPublicId);
    }
    return projects.get(0);
  }

  private List<Project> getProjects(boolean findInAllRealms) {
    TypedQuery<Project> query = findInAllRealms
        ? getEntityManager()
            .createNamedQuery(Project.FIND_ALL, Project.class)
        : getEntityManager()
            .createNamedQuery(Project.FIND_BY_REALM, Project.class)
            .setParameter(Project.REALM_ID, getRealm().getId());
    return query.getResultList();
  }

  private ClientModel getClient(String clientId) {
    ClientModel client = getRealm().getClientByClientId(clientId);
    if (client == null) {
      throw new ClientNotFound(clientId);
    } else {
      return client;
    }
  }

  private List<Project> getProjectsByIdInCurrentRealm(UUID projectPublicId) {
    return getEntityManager()
        .createNamedQuery(Project.FIND_BY_REALM_AND_PROJECT_PUBLIC_ID, Project.class)
        .setParameter(Project.REALM_ID, getRealm().getId())
        .setParameter(Project.PROJECT_PUBLIC_ID, projectPublicId)
        .getResultList();
  }

  private List<Project> getProjectsByIdInAllRealms(UUID projectPublicId) {
    return getEntityManager()
        .createNamedQuery(Project.FIND_BY_PROJECT_PUBLIC_ID, Project.class)
        .setParameter(Project.PROJECT_PUBLIC_ID, projectPublicId)
        .getResultList();
  }

  // TODO (WAYS-294): it should be done in more elegant way
  private void validateProjectInput(ProjectRepresentation project) {
    if (project.getProjectPublicId() == null) {
      throw new MissingRequiredParamException("project_public_id");
    }
    try {
      UUID publicId = project.getProjectPublicId();
      validateNameInput(project.getName());
      validateKidInput(project.getKid(), publicId);
    } catch (IllegalArgumentException ex) {
      throw new BadRequestException(ex.getMessage());
    }
  }

  private void validateNameInput(String name) {
    if (name == null || name.isEmpty()) {
      throw new MissingRequiredParamException("name");
    }
  }

  private void checkKeyExistence(String kid) {
    if (kid != null && !kid.isEmpty()) {
      Optional<KeyWrapper> keyWrapperOpt = session.keys().getKeysStream(getRealm()).filter(key -> key.getKid().equals(kid))
          .findFirst();
      if (keyWrapperOpt.isEmpty()) {
        throw new BadRequestException(String.format("Key '%s' not found", kid));
      }
    }
  }

  private void validateKidInput(String kid, UUID projectPublicId) {
    checkKeyExistence(kid);
    if (projectInCurrentRealmForKid(kid).filter(project -> !project.getProjectPublicId().equals(projectPublicId)).isPresent()) {
      throw new BadRequestException(String.format("Key '%s' is already in use", kid));
    }
  }

  private Optional<Project> projectInCurrentRealmForKid(String kid) {
    return getEntityManager()
        .createNamedQuery(Project.FIND_BY_REALM_AND_KID, Project.class)
        .setParameter(Project.REALM_ID, getRealm().getId())
        .setParameter(Project.KID, kid)
        .getResultList().stream().findFirst();
  }
}
