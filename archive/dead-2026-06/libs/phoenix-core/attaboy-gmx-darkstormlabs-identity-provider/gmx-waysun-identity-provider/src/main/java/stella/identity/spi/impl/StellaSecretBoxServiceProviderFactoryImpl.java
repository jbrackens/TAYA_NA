package stella.identity.spi.impl;

import java.util.Optional;

import org.keycloak.Config;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

import stella.identity.config.ServiceConfig;
import stella.identity.spi.StellaSecretBoxService;
import stella.identity.spi.StellaSecretBoxServiceProviderFactory;

public class StellaSecretBoxServiceProviderFactoryImpl implements StellaSecretBoxServiceProviderFactory {

  private final String ID = "stella-secret-box-impl";

  @Override
  public StellaSecretBoxService create(KeycloakSession keycloakSession) {
    Optional<String> libsodiumPath = Optional.of(ServiceConfig.getConfig().identity_provider.crypt.libsodium_path);
    String secretBoxHexKey = ServiceConfig.getConfig().identity_provider.crypt.secret_box_hex_key;
    return new StellaSecretBoxServiceImpl(libsodiumPath, secretBoxHexKey);
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
