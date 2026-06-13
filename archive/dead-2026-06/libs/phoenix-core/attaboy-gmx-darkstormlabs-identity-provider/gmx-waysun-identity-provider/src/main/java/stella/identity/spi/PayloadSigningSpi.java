package stella.identity.spi;

import org.keycloak.provider.Provider;
import org.keycloak.provider.ProviderFactory;
import org.keycloak.provider.Spi;

public class PayloadSigningSpi implements Spi {

  @Override
  public boolean isInternal() {
    return false;
  }

  @Override
  public String getName() {
    return "stella-payload-signing";
  }

  @Override
  public Class<? extends Provider> getProviderClass() {
    return PayloadSigningService.class;
  }

  @Override
  @SuppressWarnings("rawtypes")
  public Class<? extends ProviderFactory> getProviderFactoryClass() {
    return PayloadSigningServiceProviderFactory.class;
  }
}
