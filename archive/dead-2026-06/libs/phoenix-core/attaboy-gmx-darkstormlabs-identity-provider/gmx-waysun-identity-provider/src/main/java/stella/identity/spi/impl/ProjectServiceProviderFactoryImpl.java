package stella.identity.spi.impl;

import org.keycloak.Config;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

import stella.identity.spi.ProjectService;
import stella.identity.spi.ProjectServiceProviderFactory;

public class ProjectServiceProviderFactoryImpl implements ProjectServiceProviderFactory {

  private final String ID = "project-service-impl";

  @Override
  public ProjectService create(KeycloakSession keycloakSession) {
    return new ProjectServiceImpl(keycloakSession);
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
