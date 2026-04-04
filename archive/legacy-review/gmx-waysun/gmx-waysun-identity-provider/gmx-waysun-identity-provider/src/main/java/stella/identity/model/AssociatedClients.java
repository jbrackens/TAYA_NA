package stella.identity.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Clients associated with a project
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AssociatedClients {
  private List<ClientInfo> primary;
  private List<ClientInfo> additional;
}
