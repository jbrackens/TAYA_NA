package stella.identity.spi;

import org.keycloak.provider.Provider;

import stella.identity.crypt.SecretBoxUtils;
import stella.identity.jwt.JwtExtraField;

public interface StellaSecretBoxService extends Provider {

  String encrypt(JwtExtraField extra) throws SecretBoxUtils.SecretBoxEncryptionException;
  JwtExtraField decrypt(String base64Secret) throws SecretBoxUtils.SecretBoxDecryptionException;
}
