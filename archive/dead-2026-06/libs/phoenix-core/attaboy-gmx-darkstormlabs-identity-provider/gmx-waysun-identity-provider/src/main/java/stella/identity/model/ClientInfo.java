package stella.identity.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import org.keycloak.models.jpa.entities.ClientEntity;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ClientInfo {
  private String clientId;
  private String clientUuid;
  private String name;

  public ClientInfo(ClientEntity client) {
    this.clientId = client.getClientId();
    this.clientUuid = client.getId();
    this.name = client.getName();
  }
}
