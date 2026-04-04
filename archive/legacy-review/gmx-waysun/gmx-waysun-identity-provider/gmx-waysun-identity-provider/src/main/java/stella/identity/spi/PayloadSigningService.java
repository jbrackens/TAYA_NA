package stella.identity.spi;

import java.security.PrivateKey;

import org.keycloak.provider.Provider;

public interface PayloadSigningService extends Provider {

  String sign(String payload, PrivateKey key);
}
