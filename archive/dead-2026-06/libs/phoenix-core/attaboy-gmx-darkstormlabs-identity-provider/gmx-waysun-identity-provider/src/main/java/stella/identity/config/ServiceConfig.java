package stella.identity.config;

import com.typesafe.config.ConfigFactory;
import lombok.Getter;

public class ServiceConfig {

  @Getter(lazy = true)
  private static final IdentityProviderConfig config =
      // we need to specify a proper class loader as otherwise application.conf is not picked when running on JBoss
      new IdentityProviderConfig(ConfigFactory.load(ServiceConfig.class.getClassLoader()).resolve());
}
