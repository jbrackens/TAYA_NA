package stella.identity.utils;

import static java.util.UUID.randomUUID;

import java.util.List;

import org.apache.commons.lang.RandomStringUtils;
import org.jetbrains.annotations.NotNull;
import org.testcontainers.shaded.okhttp3.RequestBody;

import stella.identity.model.AssociatedClients;
import stella.identity.model.ClientInfo;
import stella.identity.model.ExtendedProjectRepresentation;
import stella.identity.model.ProjectCreateRequest;
import stella.identity.model.ProjectRepresentation;

public class TestUtils {

  public static RequestBody EMPTY_REQUEST_BODY = RequestBody.create(null, "");

  public static ProjectRepresentation randomProjectRepresentation(String realmId) {
    String name = getRandomName();
    String description = RandomStringUtils.randomAlphanumeric(255);
    ProjectRepresentation project = new ProjectRepresentation();
    project.setProjectPublicId(randomUUID());
    project.setName(name);
    project.setDescription(description);
    project.setRealmId(realmId);
    return project;
  }

  public static ExtendedProjectRepresentation randomExtendedProjectRepresentation(String realmId) {
    String name = getRandomName();
    String description = RandomStringUtils.randomAlphanumeric(255);
    ExtendedProjectRepresentation project = new ExtendedProjectRepresentation();
    project.setProjectPublicId(randomUUID());
    project.setName(name);
    project.setDescription(description);
    project.setRealmId(realmId);
    List<ClientInfo> primary = List.of(new ClientInfo(getRandomName(), randomUUID().toString(), getRandomName()),
        new ClientInfo(getRandomName(), randomUUID().toString(), getRandomName()));
    List<ClientInfo> additional = List.of(new ClientInfo(getRandomName(), randomUUID().toString(), getRandomName()),
        new ClientInfo(getRandomName(), randomUUID().toString(), getRandomName()));
    AssociatedClients clients = new AssociatedClients(primary, additional);
    project.setClients(clients);
    return project;
  }

  public static ProjectCreateRequest randomProjectCreateRequest() {
    String name = getRandomName();
    String description = RandomStringUtils.randomAlphanumeric(255);
    String kid = RandomStringUtils.randomAlphanumeric(20);
    ProjectCreateRequest project = new ProjectCreateRequest();
    project.setName(name);
    project.setDescription(description);
    project.setKid(kid);
    return project;
  }

  @NotNull
  private static String getRandomName() {
    return RandomStringUtils.randomAlphanumeric(20);
  }
}
