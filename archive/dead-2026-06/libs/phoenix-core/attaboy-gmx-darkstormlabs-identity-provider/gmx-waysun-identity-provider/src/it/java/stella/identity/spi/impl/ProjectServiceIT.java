package stella.identity.spi.impl;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;

import org.keycloak.models.ClientModel;
import org.keycloak.models.jpa.entities.ClientEntity;
import org.keycloak.models.jpa.entities.RealmEntity;

import stella.identity.exception.ClientNotFound;
import stella.identity.exception.ProjectAlreadyAssociated;
import stella.identity.exception.ProjectAlreadyExists;
import stella.identity.exception.ProjectNotFound;
import stella.identity.exception.ProjectPublicIdNotFound;
import stella.identity.jpa.ClientProjectDTO;
import stella.identity.jpa.Project;
import stella.identity.model.AssociatedClients;
import stella.identity.model.ClientInfo;
import stella.identity.model.ExtendedProjectRepresentation;
import stella.identity.model.ProjectRepresentation;
import stella.identity.utils.TestUtils;

class ProjectServiceIT extends DBTestBase {

  private ProjectServiceImpl service;

  @Mock
  private ClientModel clientModel;

  @BeforeEach
  protected void beforeEach() {
    super.beforeEach();
    service = new ProjectServiceImpl(keycloakSession);
  }

  class TestData {
    Project project1;
    Project project2;
    Project project3;
    Project project4;
    Project otherRealmProject1;
    Project otherRealmProject2;

    ExtendedProjectRepresentation extendedProject1;
    ExtendedProjectRepresentation extendedProject2;
    ExtendedProjectRepresentation extendedProject3;
    ExtendedProjectRepresentation extendedProject4;
    ExtendedProjectRepresentation otherRealmExtendedProject1;
    ExtendedProjectRepresentation otherRealmExtendedProject2;

    public TestData() {
      RealmEntity otherRealm = createRealm();

      // GIVEN: a couple of clients and a couple of projects while projects are associated with clients
      ClientEntity client1 = createRandomClient(realm);
      ClientEntity client2 = createRandomClient(realm);
      ClientEntity client3 = createRandomClient(realm);
      ClientEntity client4 = createRandomClient(realm);

      ClientEntity otherRealmClient1 = createRandomClient(otherRealm);
      ClientEntity otherRealmClient2 = createRandomClient(otherRealm);

      ProjectRepresentation project1ToAdd = randomProjectRepresentationForRealmModel();
      ProjectRepresentation project2ToAdd = randomProjectRepresentationForRealmModel();
      ProjectRepresentation project3ToAdd = randomProjectRepresentationForRealmModel();
      ProjectRepresentation project4ToAdd = randomProjectRepresentationForRealmModel();

      service.addProject(project1ToAdd);
      service.addProject(project2ToAdd);
      service.addProject(project3ToAdd);
      service.addProject(project4ToAdd);

      ProjectRepresentation otherRealmProject1ToAdd = randomProjectRepresentation(otherRealm.getId());
      ProjectRepresentation otherRealmProject2ToAdd = randomProjectRepresentation(otherRealm.getId());

      service.addProject(otherRealmProject1ToAdd);
      service.addProject(otherRealmProject2ToAdd);

      this.project1 = service.getProject(project1ToAdd.getProjectPublicId());
      this.project2 = service.getProject(project2ToAdd.getProjectPublicId());
      this.project3 = service.getProject(project3ToAdd.getProjectPublicId());
      this.project4 = service.getProject(project4ToAdd.getProjectPublicId());
      service.addAssociatedProjectToClient(client1.getId(), project1, /* primary= */ true);
      service.addAssociatedProjectToClient(client2.getId(), project1, /* primary= */ true);
      service.addAssociatedProjectToClient(client4.getId(), project1, /* primary= */ false);
      service.addAssociatedProjectToClient(client3.getId(), project1, /* primary= */ false);
      service.addAssociatedProjectToClient(client3.getId(), project2, /* primary= */ true);
      service.addAssociatedProjectToClient(client2.getId(), project3, /* primary= */ false);

      this.otherRealmProject1 = service.getProject(otherRealmProject1ToAdd.getProjectPublicId(), /* findInAllRealms= */ true);
      this.otherRealmProject2 = service.getProject(otherRealmProject2ToAdd.getProjectPublicId(), /* findInAllRealms= */ true);
      service.addAssociatedProjectToClient(otherRealmClient1.getId(), otherRealmProject1, /* primary= */ true);
      service.addAssociatedProjectToClient(otherRealmClient1.getId(), otherRealmProject2, /* primary= */ false);
      service.addAssociatedProjectToClient(otherRealmClient2.getId(), otherRealmProject1, /* primary= */ false);
      service.addAssociatedProjectToClient(otherRealmClient2.getId(), otherRealmProject2, /* primary= */ true);

      ClientInfo client1Info = new ClientInfo(client1);
      ClientInfo client2Info = new ClientInfo(client2);
      ClientInfo client3Info = new ClientInfo(client3);
      ClientInfo client4Info = new ClientInfo(client4);
      ClientInfo otherRealmClient1Info = new ClientInfo(otherRealmClient1);
      ClientInfo otherRealmClient2Info = new ClientInfo(otherRealmClient2);

      this.extendedProject1 = new ExtendedProjectRepresentation(project1, new AssociatedClients(
          List.of(client1Info, client2Info), List.of(client4Info, client3Info)));
      this.extendedProject2 = new ExtendedProjectRepresentation(project2,
          new AssociatedClients(List.of(client3Info), Collections.emptyList()));
      this.extendedProject3 = new ExtendedProjectRepresentation(project3,
          new AssociatedClients(Collections.emptyList(), List.of(client2Info)));
      this.extendedProject4 = new ExtendedProjectRepresentation(project4,
          new AssociatedClients(Collections.emptyList(), Collections.emptyList()));

      this.otherRealmExtendedProject1 = new ExtendedProjectRepresentation(otherRealmProject1,
          new AssociatedClients(List.of(otherRealmClient1Info), List.of(otherRealmClient2Info)));
      this.otherRealmExtendedProject2 = new ExtendedProjectRepresentation(otherRealmProject2,
          new AssociatedClients(List.of(otherRealmClient2Info), List.of(otherRealmClient1Info)));
    }
  }

  @Test
  void shouldCreateProject() {
    runAndClean(() -> {
      ProjectRepresentation result = service.addProject(randomProjectRepresentationForRealmModel());

      assertThat(result, is(getProjectRep(result.getProjectPublicId(), realmModel.getId())));
    });
  }

  @Test
  @DisplayName("addProject should throw ProjectAlreadyExists if project with given project_public_id already exists in realm")
  void failIfProjectWithGivenProjectPublicIdIsAlreadyExistInRealm() {
    UUID publicId = UUID.randomUUID();
    ProjectRepresentation project1 = randomProjectRepresentationForRealmModel();
    ProjectRepresentation project2 = randomProjectRepresentationForRealmModel();
    project1.setProjectPublicId(publicId);
    project2.setProjectPublicId(publicId);

    assertThrows(ProjectAlreadyExists.class, () -> runAndClean(() -> {
      service.addProject(project1);
      service.addProject(project2);
    }));
  }

  @Test
  @DisplayName("addProject should fail to add projects with the same projectPublicId (even across realms)")
  void shouldFailToAddProjectsWithSameProjectPublicId() {
    runAndCleanExpectingFailure(() -> {
      UUID publicId = UUID.randomUUID();
      ProjectRepresentation project1 = randomProjectRepresentationForRealmModel();
      ProjectRepresentation project2 = randomProjectRepresentationForRealmModel();
      project1.setProjectPublicId(publicId);
      project2.setProjectPublicId(publicId);

      RealmEntity realmEntity1 = createRealm();
      RealmEntity realmEntity2 = createRealm();

      when(realmModel.getId()).thenReturn(realmEntity1.getId());
      service.addProject(project1);

      when(realmModel.getId()).thenReturn(realmEntity2.getId());

      assertThrows(ProjectAlreadyExists.class, () -> service.addProject(project2));
    });
  }

  @Test
  @DisplayName("addProject should fail to add projects with the same name in the same realm")
  void shouldFailToAddProjectsWithSameNameInTheSameRealm() {
    runAndCleanExpectingFailure(() -> {
      String name = "someName";
      ProjectRepresentation project1 = randomProjectRepresentationForRealmModel();
      ProjectRepresentation project2 = randomProjectRepresentationForRealmModel();
      project1.setName(name);
      project2.setName(name.toUpperCase());

      service.addProject(project1);
      assertThrows(ProjectAlreadyExists.class, () -> service.addProject(project2));
    });
  }

  @Test
  @DisplayName("addProject can add projects with the same name but to different realms")
  void shouldAddProjectsWithSameProjectNameButInDifferentRealms() {
    runAndClean(() -> {

      RealmEntity realmEntity1 = createRealm();
      RealmEntity realmEntity2 = createRealm();

      when(realmModel.getId()).thenReturn(realmEntity1.getId());
      ProjectRepresentation project1 = randomProjectRepresentationForRealmModel();
      ProjectRepresentation result1 = service.addProject(project1);

      when(realmModel.getId()).thenReturn(realmEntity2.getId());
      ProjectRepresentation project2 = randomProjectRepresentationForRealmModel();
      project2.setName(project1.getName());
      ProjectRepresentation result2 = service.addProject(project2);

      assertThat(result1, is(getProjectRep(project1.getProjectPublicId(), realmEntity1.getId())));
      assertThat(result2, is(getProjectRep(project2.getProjectPublicId(), realmEntity2.getId())));
    });
  }

  @Test
  void shouldListProjectsInAllRealms() {
    runAndClean(() -> {
      TestData testData = new TestData();
      boolean findInAllRealms = true;
      List<ProjectRepresentation> projects = service.listProjects(findInAllRealms);
      assertThat(projects, hasSize(6));
      assertThat(projects,
          hasItems(new ProjectRepresentation(testData.project1), new ProjectRepresentation(testData.project2),
              new ProjectRepresentation(testData.project3), new ProjectRepresentation(testData.project4),
              new ProjectRepresentation(testData.otherRealmProject1), new ProjectRepresentation(testData.otherRealmProject2)));
    });
  }

  @Test
  void shouldListProjectsInCurrentRealm() {
    runAndClean(() -> {
      TestData testData = new TestData();
      boolean findInAllRealms = false;
      List<ProjectRepresentation> projects = service.listProjects(findInAllRealms);
      assertThat(projects, hasSize(4));
      assertThat(projects,
          hasItems(new ProjectRepresentation(testData.project1), new ProjectRepresentation(testData.project2),
              new ProjectRepresentation(testData.project3), new ProjectRepresentation(testData.project4)));
    });
  }

  @Test
  void findProjectWithClientsInAllRealms() {
    runAndClean(() -> {
      TestData testData = new TestData();
      boolean findInAllRealms = true;
      assertThat(service.findProjectWithClients(testData.extendedProject1.getProjectPublicId(), findInAllRealms),
          equalTo(testData.extendedProject1));
      assertThat(service.findProjectWithClients(testData.extendedProject2.getProjectPublicId(), findInAllRealms),
          equalTo(testData.extendedProject2));
      assertThat(service.findProjectWithClients(testData.extendedProject3.getProjectPublicId(), findInAllRealms),
          equalTo(testData.extendedProject3));
      assertThat(service.findProjectWithClients(testData.extendedProject4.getProjectPublicId(), findInAllRealms),
          equalTo(testData.extendedProject4));
      assertThat(service.findProjectWithClients(testData.otherRealmExtendedProject1.getProjectPublicId(), findInAllRealms),
          equalTo(testData.otherRealmExtendedProject1));
      assertThat(service.findProjectWithClients(testData.otherRealmExtendedProject2.getProjectPublicId(), findInAllRealms),
          equalTo(testData.otherRealmExtendedProject2));
    });
  }

  @Test
  void findProjectWithClientsInCurrentRealm() {
    runAndClean(() -> {
      TestData testData = new TestData();
      boolean findInAllRealms = false;
      assertThat(service.findProjectWithClients(testData.extendedProject1.getProjectPublicId(), findInAllRealms),
          equalTo(testData.extendedProject1));
      assertThat(service.findProjectWithClients(testData.extendedProject2.getProjectPublicId(), findInAllRealms),
          equalTo(testData.extendedProject2));
      assertThat(service.findProjectWithClients(testData.extendedProject3.getProjectPublicId(), findInAllRealms),
          equalTo(testData.extendedProject3));
      assertThat(service.findProjectWithClients(testData.extendedProject4.getProjectPublicId(), findInAllRealms),
          equalTo(testData.extendedProject4));

      assertThrows(ProjectNotFound.class,
          () -> service.findProjectWithClients(testData.otherRealmProject1.getProjectPublicId(), findInAllRealms));
      assertThrows(ProjectNotFound.class,
          () -> service.findProjectWithClients(testData.otherRealmProject2.getProjectPublicId(), findInAllRealms));
    });
  }

  @Test
  @DisplayName("findPrimaryProjectByClientId should throw ClientNotFound when client does not exist")
  void testFindPrimaryProjectByClientIdWhenClientDoesNotExist() {
    createRandomClient(realm);

    String nonExistingClientId = UUID.randomUUID().toString();
    ClientNotFound exception = assertThrows(ClientNotFound.class,
        () -> service.findPrimaryProjectByClientId(nonExistingClientId));
    assertThat(exception.getMessage(), is(String.format("Client '%s' not found", nonExistingClientId)));
  }

  @Test
  @DisplayName("findPrimaryProjectByClientId should throw ProjectPublicIdIdNotFound when client is not associated with any project")
  void testFindPrimaryProjectByClientIdWhenClientIsNotAssociatedWithProject() {
    runAndClean(() -> {
      ClientEntity client = createRandomClient(realm);

      when(realmModel.getClientByClientId(client.getClientId())).thenReturn(clientModel);
      when(clientModel.getId()).thenReturn(client.getId());

      ProjectPublicIdNotFound exception = assertThrows(ProjectPublicIdNotFound.class,
          () -> service.findPrimaryProjectByClientId(client.getClientId()));
      assertProjectPublicIdNotFoundErrorMessage(exception, client.getId());
    });
  }

  @Test
  @DisplayName("findPrimaryProjectByClientId should return result when project and clients exist and are associated")
  void testFindPrimaryProjectByClientId() {
    runAndClean(() -> {
      ClientEntity client = createRandomClient(realm);
      ProjectRepresentation project = randomProjectRepresentationForRealmModel();
      service.addProject(project);
      Long projectId = getProject(project.getProjectPublicId()).getId();
      associateClientWithProject(client.getClientId(), projectId, true);

      when(realmModel.getClientByClientId(client.getClientId())).thenReturn(clientModel);
      when(clientModel.getId()).thenReturn(client.getId());

      try {
        UUID publicId = service.findPrimaryProjectByClientId(client.getClientId()).getProjectPublicId();
        assertThat(publicId, is(project.getProjectPublicId()));
      } catch (Throwable e) {
        fail(String.format("No exception expected but was %s", e));
      }
    });
  }

  @Test
  @DisplayName("findAllProjectsByClientId should throw ClientNotFound when client does not exist")
  void testFindAllProjectsByClientIdWhenClientDoesNotExist() {
    createRandomClient(realm);

    String nonExistingClientId = UUID.randomUUID().toString();
    ClientNotFound exception = assertThrows(ClientNotFound.class,
        () -> service.findAllProjectsByClientId(nonExistingClientId));
    assertThat(exception.getMessage(), is(String.format("Client '%s' not found", nonExistingClientId)));
  }

  @Test
  @DisplayName("findAllProjectsByClientId should return an empty List when client is not associated with any project")
  void testFindAllProjectsByClientIdWhenClientIsNotAssociatedWithAdditionalProjects() {
    runAndClean(() -> {
      ClientEntity client = createRandomClient(realm);

      when(realmModel.getClientByClientId(client.getClientId())).thenReturn(clientModel);
      when(clientModel.getId()).thenReturn(client.getId());

      List<ClientProjectDTO> result = service.findAllProjectsByClientId(client.getClientId());
      assertThat(result, empty());
    });
  }

  @Test
  @DisplayName("findAllProjectsByClientId should return result when client has projects associated")
  void testFindAllProjectsByClientId() {
    runAndClean(() -> {
      ClientEntity client = createRandomClient(realm);
      ProjectRepresentation mainProject = randomProjectRepresentationForRealmModel();
      service.addProject(mainProject);
      associateClientWithProject(client.getClientId(), getProject(mainProject.getProjectPublicId()).getId(), true);

      ProjectRepresentation additionalProject = randomProjectRepresentationForRealmModel();
      service.addProject(additionalProject);
      associateClientWithProject(client.getClientId(), getProject(additionalProject.getProjectPublicId()).getId(), false);

      when(realmModel.getClientByClientId(client.getClientId())).thenReturn(clientModel);
      when(clientModel.getId()).thenReturn(client.getId());

      try {
        List<ClientProjectDTO> allProjects = service.findAllProjectsByClientId(client.getClientId());
        assertThat(allProjects.size(), is(2));
        assertThat(allProjects.get(0).getProject().getProjectPublicId(), is(mainProject.getProjectPublicId()));
        assertThat(allProjects.get(0).getClientProject().isPrimary(), is(true));
        assertThat(allProjects.get(1).getProject().getProjectPublicId(), is(additionalProject.getProjectPublicId()));
        assertThat(allProjects.get(1).getClientProject().isPrimary(), is(false));
      } catch (Throwable e) {
        fail(String.format("No exception expected but was %s", e));
      }
    });
  }

  @Test
  @DisplayName("DB constraint should prevent associating multiple primary projects with a client")
  void failAssociatingClientProjectsIfWeAlreadyHaveAPrimaryProjectForTheClient() {
    runAndCleanExpectingFailure(() -> {

      ClientEntity client = createRandomClient(realm);
      ProjectRepresentation project1 = randomProjectRepresentationForRealmModel();
      project1.setProjectPublicId(UUID.randomUUID());
      ProjectRepresentation project2 = randomProjectRepresentationForRealmModel();
      project2.setProjectPublicId(UUID.randomUUID());
      ProjectRepresentation project3 = randomProjectRepresentationForRealmModel();
      project3.setProjectPublicId(UUID.randomUUID());
      service.addProject(project1);
      service.addProject(project2);
      service.addProject(project3);
      Project projectEntity1 = getProject(project1.getProjectPublicId());
      Project projectEntity2 = getProject(project2.getProjectPublicId());
      Project projectEntity3 = getProject(project3.getProjectPublicId());

      service.addAssociatedProjectToClient(client.getId(), projectEntity1, true);
      service.addAssociatedProjectToClient(client.getId(), projectEntity2, false);

      assertThrows(ProjectAlreadyAssociated.class,
          () -> service.addAssociatedProjectToClient(client.getId(), projectEntity3, true));
    });
  }

  @Test
  @DisplayName("DB constraint should prevent associating the same project with a client multiple times")
  void failAssociatingClientProjectsIfWeAlreadyHaveTheProjectForTheClient() {
    runAndCleanExpectingFailure(() -> {

      ClientEntity client = createRandomClient(realm);
      ProjectRepresentation project1 = randomProjectRepresentationForRealmModel();
      project1.setProjectPublicId(UUID.randomUUID());
      service.addProject(project1);
      Project projectEntity1 = getProject(project1.getProjectPublicId());

      service.addAssociatedProjectToClient(client.getId(), projectEntity1, true);

      assertThrows(ProjectAlreadyAssociated.class,
          () -> service.addAssociatedProjectToClient(client.getId(), projectEntity1, false));
    });
  }

  private ProjectRepresentation getProjectRep(UUID projectPublicId, String realmId) {
    return new ProjectRepresentation(getProject(projectPublicId, realmId));
  }

  private Project getProject(UUID projectPublicId) {
    return getProject(projectPublicId, realmModel.getId());
  }

  private Project getProject(UUID projectPublicId, String realmId) {
    return entityManager.createNamedQuery(Project.FIND_BY_REALM_AND_PROJECT_PUBLIC_ID, Project.class)
        .setParameter(Project.REALM_ID, realmId)
        .setParameter(Project.PROJECT_PUBLIC_ID, projectPublicId)
        .getSingleResult();
  }

  private void assertProjectPublicIdNotFoundErrorMessage(ProjectPublicIdNotFound exception, String clientId) {
    assertThat(exception.getMessage(), is(String.format("Could not find project associated with client '%s'", clientId)));
  }

  private ProjectRepresentation randomProjectRepresentationForRealmModel() {
    return randomProjectRepresentation(realmModel.getId());
  }

  private ProjectRepresentation randomProjectRepresentation(String realmId) {
    return TestUtils.randomProjectRepresentation(realmId);
  }
}
