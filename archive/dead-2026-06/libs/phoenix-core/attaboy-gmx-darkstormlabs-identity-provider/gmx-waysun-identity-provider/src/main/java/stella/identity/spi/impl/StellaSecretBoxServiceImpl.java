package stella.identity.spi.impl;

import java.io.IOException;
import java.util.Optional;

import lombok.Getter;

import org.keycloak.util.JsonSerialization;

import stella.identity.crypt.SecretBoxUtils;
import stella.identity.jwt.JwtExtraField;
import stella.identity.spi.StellaSecretBoxService;

public class StellaSecretBoxServiceImpl implements StellaSecretBoxService {

  private final Optional<String> libsodiumPath;
  private final String secretBoxHexKey;

  @Getter(lazy = true)
  private final SecretBoxUtils secretBoxUtils = libsodiumPath
      .map(SecretBoxUtils::new)
      .orElseGet(SecretBoxUtils::new);

  public StellaSecretBoxServiceImpl(Optional<String> libsodiumPath, String secretBoxHexKey) {
    this.libsodiumPath = libsodiumPath;
    this.secretBoxHexKey = secretBoxHexKey;
  }

  @Override
  public String encrypt(JwtExtraField extra) throws SecretBoxUtils.SecretBoxEncryptionException {
    try {
      String extraAsJson = JsonSerialization.writeValueAsString(extra);
      return getSecretBoxUtils().encrypt(extraAsJson, secretBoxHexKey);
    } catch (IOException e) {
      throw new SecretBoxUtils.SecretBoxEncryptionException("Could not serialize JwtExtraField as JSON", e.getCause());
    }
  }

  @Override
  public JwtExtraField decrypt(String base64Secret) throws SecretBoxUtils.SecretBoxDecryptionException {
    try {
      String extraAsJson = getSecretBoxUtils().decrypt(base64Secret, secretBoxHexKey);
      return JsonSerialization.readValue(extraAsJson, JwtExtraField.class);
    } catch (IOException e) {
      throw new SecretBoxUtils.SecretBoxDecryptionException("Could not deserialize JwtExtraField as JSON", e.getCause());
    }
  }

  @Override
  public void close() {}
}
