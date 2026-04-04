package stella.identity.model;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import stella.identity.jpa.Project;

@Data
@NoArgsConstructor
public class ExtendedProjectRepresentation {

  private String name;
  private String description;
  @JsonProperty("project_id")
  private UUID projectPublicId;
  private String kid;

  @JsonProperty("realm_id")
  private String realmId;

  private AssociatedClients clients;

  public ExtendedProjectRepresentation(Project project, AssociatedClients clients) {
    this.name = project.getName();
    this.description = project.getDescription();
    this.projectPublicId = project.getProjectPublicId();
    this.kid = project.getKid();
    this.realmId = project.getRealmId();
    this.clients = clients;
  }
}
