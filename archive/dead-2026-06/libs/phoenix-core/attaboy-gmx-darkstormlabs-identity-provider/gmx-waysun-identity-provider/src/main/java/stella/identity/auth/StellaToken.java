package stella.identity.auth;

import lombok.Data;
import lombok.EqualsAndHashCode;

import org.keycloak.representations.IDToken;

@Data
@EqualsAndHashCode(callSuper = true)
public class StellaToken extends IDToken {

  private String extra;

}
