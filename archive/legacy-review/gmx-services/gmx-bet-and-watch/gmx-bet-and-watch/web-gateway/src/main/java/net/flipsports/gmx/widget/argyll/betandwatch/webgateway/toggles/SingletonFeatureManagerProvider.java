package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.toggles;

import org.togglz.core.manager.FeatureManager;
import org.togglz.core.manager.FeatureManagerBuilder;
import org.togglz.core.repository.cache.CachingStateRepository;
import org.togglz.core.spi.FeatureManagerProvider;
import org.togglz.core.user.NoOpUserProvider;

import java.util.concurrent.TimeUnit;

public class SingletonFeatureManagerProvider implements FeatureManagerProvider {

  private static FeatureManager featureManager;

  @Override
  public int priority() {
    return 30;
  }

  @Override
  public synchronized FeatureManager getFeatureManager() {

    if (featureManager == null) {
      featureManager = new FeatureManagerBuilder()
          .featureEnum(Toggles.class)
          .stateRepository(new CachingStateRepository(new ConfigBasedStateRepository(), 1, TimeUnit.MINUTES))
          .userProvider(new NoOpUserProvider())
          .build();
    }

    return featureManager;
  }
}