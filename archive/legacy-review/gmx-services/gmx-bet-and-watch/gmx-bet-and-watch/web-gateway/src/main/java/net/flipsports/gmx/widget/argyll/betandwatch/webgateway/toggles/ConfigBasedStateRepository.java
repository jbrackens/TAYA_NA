package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.toggles;

import org.togglz.core.repository.property.PropertyBasedStateRepository;

public class ConfigBasedStateRepository extends PropertyBasedStateRepository {

  public ConfigBasedStateRepository() {
    super(new ConfigPropertySource());
  }
}
