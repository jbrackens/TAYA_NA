package tech.argyll.video.datafeed.config;

import io.ebean.EbeanServer;
import javax.inject.Inject;
import javax.inject.Provider;
import tech.argyll.video.domain.config.EbeanServerConfigured;

public class EbeanServerProvider implements Provider<EbeanServer> {

  private final EbeanServerConfigured ebeanServerConfig;

  @Inject
  public EbeanServerProvider(EbeanServerConfigured ebeanServerConfig) {
    this.ebeanServerConfig = ebeanServerConfig;
  }

  @Override
  public EbeanServer get() {
    return ebeanServerConfig.create();
  }
}
