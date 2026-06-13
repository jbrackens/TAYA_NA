package stella.identity.spi.impl;

import org.keycloak.Config;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

import stella.identity.spi.PayloadSigningService;
import stella.identity.spi.PayloadSigningServiceProviderFactory;

public class PayloadSigningServiceProviderFactoryImpl implements PayloadSigningServiceProviderFactory {

  private final String ID = "payload-signing-service-provider-factory-impl";

  @Override
  public PayloadSigningService create(KeycloakSession keycloakSession) {
    return new PayloadSigningServiceImpl();
  }

  @Override
  public void init(Config.Scope scope) {}

  @Override
  public void postInit(KeycloakSessionFactory keycloakSessionFactory) {}

  @Override
  public void close() {}

  @Override
  public String getId() {
    return ID;
  }
}
