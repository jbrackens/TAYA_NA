package stella.identity.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static stella.identity.utils.TestUtils.randomExtendedProjectRepresentation;
import static stella.identity.utils.TestUtils.randomProjectCreateRequest;
import static stella.identity.utils.TestUtils.randomProjectRepresentation;

import org.apache.commons.lang.RandomStringUtils;
import org.junit.jupiter.api.Test;

import stella.identity.jpa.Project;

class ProjectRepresentationTest {

  @Test
  void toProjectWithoutId() {
    String realmId = RandomStringUtils.randomAlphanumeric(50);
    ProjectRepresentation representation = randomProjectRepresentation(realmId);

    Project project = representation.toProjectWithoutId();

    assertEquals(representation.getProjectPublicId(), project.getProjectPublicId());
    assertEquals(representation.getName(), project.getName());
    assertEquals(representation.getDescription(), project.getDescription());
    assertEquals(realmId, project.getRealmId());
  }

  @Test
  void fromRequestAndRealmId() {
    String realmId = RandomStringUtils.randomAlphanumeric(50);
    ProjectCreateRequest request = randomProjectCreateRequest();

    ProjectRepresentation representation = new ProjectRepresentation(request, realmId);

    assertEquals(request.getName(), representation.getName());
    assertEquals(request.getDescription(), representation.getDescription());
    assertEquals(request.getKid(), representation.getKid());
    assertNotNull(representation.getProjectPublicId());
    assertEquals(realmId, representation.getRealmId());
  }

  @Test
  void fromExtendedProjectRepresentation() {
    String realmId = RandomStringUtils.randomAlphanumeric(50);
    ExtendedProjectRepresentation ext = randomExtendedProjectRepresentation(realmId);

    ProjectRepresentation representation = new ProjectRepresentation(ext);

    assertEquals(ext.getName(), representation.getName());
    assertEquals(ext.getDescription(), representation.getDescription());
    assertEquals(ext.getKid(), representation.getKid());
    assertEquals(ext.getProjectPublicId(), representation.getProjectPublicId());
    assertEquals(realmId, representation.getRealmId());
  }
}
