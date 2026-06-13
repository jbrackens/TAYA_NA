package stella.identity.spi.impl;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.Base64;

import org.jboss.logging.Logger;

import stella.identity.exception.SigningException;
import stella.identity.spi.PayloadSigningService;

public class PayloadSigningServiceImpl implements PayloadSigningService {

  private static final Logger logger = Logger.getLogger(PayloadSigningServiceImpl.class);

  @Override
  public String sign(String payload, PrivateKey key) {
    byte[] signSHA256Java;
    try {
      Signature signatureSHA256Java = Signature.getInstance("SHA256withRSA");
      signatureSHA256Java.initSign(key);
      signatureSHA256Java.update(payload.getBytes(StandardCharsets.UTF_8));
      signSHA256Java = signatureSHA256Java.sign();
    } catch (NoSuchAlgorithmException | SignatureException | InvalidKeyException e) {
      logger.error(String.format("Signing payload '%s' using key '%s' error", payload, key.getFormat()), e);
      throw new SigningException();
    }
    return Base64.getUrlEncoder().encodeToString(signSHA256Java).replace("=", "");
  }

  @Override
  public void close() {}
}
