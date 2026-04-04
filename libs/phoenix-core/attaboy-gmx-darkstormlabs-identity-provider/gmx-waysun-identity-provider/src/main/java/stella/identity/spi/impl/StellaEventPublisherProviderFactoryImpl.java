package stella.identity.spi.impl;

import java.net.URI;

import org.keycloak.Config;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

import stella.identity.config.IdentityProviderConfig;
import stella.identity.config.ServiceConfig;
import stella.identity.spi.PublisherTokenProvider;
import stella.identity.spi.StellaEventPublisher;
import stella.identity.spi.StellaEventPublisherProviderFactory;

public class StellaEventPublisherProviderFactoryImpl implements StellaEventPublisherProviderFactory {

  private final String ID = "stella-event-publisher-provider-factory-impl";
  private final URI eventIngestorUri = prepareEventIngestorUri();
  private static final PublisherTokenProvider PUBLISHER_TOKEN_PROVIDER = new PublisherTokenProviderImpl();

  @Override
  public StellaEventPublisher create(KeycloakSession keycloakSession) {
    return new StellaEventPublisherImpl(keycloakSession, eventIngestorUri, PUBLISHER_TOKEN_PROVIDER);
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

  private URI prepareEventIngestorUri() {
    IdentityProviderConfig.Identity_provider.Event_ingestor eventIngestorConfig = ServiceConfig
        .getConfig().identity_provider.event_ingestor;
    String uriString = String.format("%s%s", eventIngestorConfig.base_url, eventIngestorConfig.admin_event_endpoint_path);
    return URI.create(uriString);
  }
}
