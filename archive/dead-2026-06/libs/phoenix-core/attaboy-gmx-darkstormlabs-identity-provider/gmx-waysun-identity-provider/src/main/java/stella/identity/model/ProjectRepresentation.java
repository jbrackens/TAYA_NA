package stella.identity.model;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import stella.identity.jpa.Project;

@Data
@NoArgsConstructor
public class ProjectRepresentation {

  private String name;
  private String description;
  @JsonProperty("project_id")
  private UUID projectPublicId;
  private String kid;
  @JsonProperty("realm_id")
  private String realmId;

  public ProjectRepresentation(Project project) {
    this.name = project.getName();
    this.description = project.getDescription();
    this.projectPublicId = project.getProjectPublicId();
    this.kid = project.getKid();
    this.realmId = project.getRealmId();
  }

  public ProjectRepresentation(ProjectCreateRequest request, String realmId) {
    this.name = request.getName();
    this.description = request.getDescription();
    this.projectPublicId = UUID.randomUUID();
    this.kid = request.getKid();
    this.realmId = realmId;
  }

  public ProjectRepresentation(ExtendedProjectRepresentation rep) {
    this.name = rep.getName();
    this.description = rep.getDescription();
    this.projectPublicId = rep.getProjectPublicId();
    this.kid = rep.getKid();
    this.realmId = rep.getRealmId();
  }

  public Project toProjectWithoutId() {
    Project project = new Project();
    project.setRealmId(getRealmId());
    project.setProjectPublicId(getProjectPublicId());
    project.setName(getName());
    project.setDescription(getDescription());
    project.setKid(getKid());
    return project;
  }
}
