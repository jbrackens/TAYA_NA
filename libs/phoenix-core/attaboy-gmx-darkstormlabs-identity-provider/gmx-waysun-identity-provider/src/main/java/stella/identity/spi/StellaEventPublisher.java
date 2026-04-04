package stella.identity.spi;

import org.keycloak.provider.Provider;

import stella.identity.event.StellaEvent;

public interface StellaEventPublisher extends Provider {

  void publish(StellaEvent event);
}
