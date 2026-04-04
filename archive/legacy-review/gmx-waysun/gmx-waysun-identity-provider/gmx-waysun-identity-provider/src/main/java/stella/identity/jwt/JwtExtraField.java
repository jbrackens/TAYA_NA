package stella.identity.jwt;

import java.util.Set;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.NonNull;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JwtExtraField {

  /**
   * Permissions
   */
  @NonNull
  private Set<String> jpk;

  /**
   * The primary project id associated with the Client in the current context
   */
  @NonNull
  private String primaryProject;

  /**
   * List of additional project id associated with the Client in the context
   */
  @NonNull
  private Set<String> additionalProjects;
}
