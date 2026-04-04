package stella.identity.auth;

import org.keycloak.TokenVerifier;
import org.keycloak.common.VerificationException;
import org.keycloak.exceptions.TokenVerificationException;

import stella.identity.crypt.SecretBoxUtils;
import stella.identity.spi.StellaSecretBoxService;

public class StellaTokenExtraFieldValidator implements TokenVerifier.Predicate<StellaToken> {

  private final StellaSecretBoxService stellaSecretBoxService;

  public StellaTokenExtraFieldValidator(StellaSecretBoxService secretBoxService) {
    this.stellaSecretBoxService = secretBoxService;
  }

  @Override
  public boolean test(StellaToken stellaToken) throws VerificationException {
    String extra = stellaToken.getExtra();
    if (extra == null || extra.isBlank()) {
      throw new TokenVerificationException(stellaToken, "extra field is empty");
    }
    try {
      stellaSecretBoxService.decrypt(extra);
    } catch (SecretBoxUtils.SecretBoxDecryptionException e) {
      throw new TokenVerificationException(stellaToken, e.getCause());
    }
    return true;
  }
}
