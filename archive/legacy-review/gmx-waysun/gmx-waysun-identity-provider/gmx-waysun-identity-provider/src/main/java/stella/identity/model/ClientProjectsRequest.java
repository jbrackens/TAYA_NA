package stella.identity.model;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClientProjectsRequest {

  @JsonProperty("primary_project")
  private UUID primaryProject;

  @JsonProperty("additional_projects")
  private List<UUID> additionalProjects;
}
