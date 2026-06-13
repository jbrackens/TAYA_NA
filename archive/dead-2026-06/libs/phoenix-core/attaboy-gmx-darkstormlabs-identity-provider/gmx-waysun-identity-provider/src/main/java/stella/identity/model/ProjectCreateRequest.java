package stella.identity.model;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ProjectCreateRequest {
  private String name;
  private String description;
  private String kid;
}
