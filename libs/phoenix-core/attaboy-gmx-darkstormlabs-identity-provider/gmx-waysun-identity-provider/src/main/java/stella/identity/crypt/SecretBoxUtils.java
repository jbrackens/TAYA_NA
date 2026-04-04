package stella.identity.crypt;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import com.goterl.lazysodium.LazySodium;
import com.goterl.lazysodium.LazySodiumJava;
import com.goterl.lazysodium.SodiumJava;
import com.goterl.lazysodium.exceptions.SodiumException;
import com.goterl.lazysodium.utils.Base64MessageEncoder;
import com.goterl.lazysodium.utils.HexMessageEncoder;
import com.goterl.lazysodium.utils.Key;

public class SecretBoxUtils {

  public static final class SecretBoxEncryptionException extends Exception {
    public SecretBoxEncryptionException(String message, Throwable cause) {
      super(message, cause);
    }
  }

  public static final class SecretBoxDecryptionException extends Exception {
    public SecretBoxDecryptionException(String message, Throwable cause) {
      super(message, cause);
    }
  }

  private static final int NONCE_SIZE = 24;

  private final LazySodiumJava lazySodiumForEncryption;
  private final LazySodiumJava lazySodiumForDecryption;

  public SecretBoxUtils() {
    this(new SodiumJava());
  }

  public SecretBoxUtils(String nativeSodiumLibAbsolutePath) {
    this(new SodiumJava(nativeSodiumLibAbsolutePath));
  }

  private SecretBoxUtils(SodiumJava sodium) {
    this.lazySodiumForEncryption = new LazySodiumJava(sodium, new HexMessageEncoder());
    this.lazySodiumForDecryption = new LazySodiumJava(sodium, new Base64MessageEncoder());
  }

  public String encrypt(String secret, String hexKey) throws SecretBoxEncryptionException {
    try {
      byte[] nonce = lazySodiumForEncryption.nonce(NONCE_SIZE);
      String encryptedSecret = lazySodiumForEncryption.cryptoSecretBoxEasy(secret, nonce, Key.fromHexString(hexKey));
      byte[] secretBoxBytes = LazySodium.toBin(encryptedSecret);
      byte[] nonceAndSecret = new byte[nonce.length + secretBoxBytes.length];
      System.arraycopy(nonce, 0, nonceAndSecret, 0, nonce.length);
      System.arraycopy(secretBoxBytes, 0, nonceAndSecret, nonce.length, secretBoxBytes.length);
      return Base64.getUrlEncoder().encodeToString(nonceAndSecret);
    } catch (SodiumException e) {
      throw new SecretBoxEncryptionException(String.format("Could not encrypt secret '%s'", secret), e);
    }
  }

  public String decrypt(String base64Secret, String hexKey) throws SecretBoxDecryptionException {
    try {
      byte[] secret = Base64.getUrlDecoder().decode(base64Secret.getBytes(StandardCharsets.UTF_8));
      byte[] nonce = new byte[NONCE_SIZE];
      byte[] cipher = new byte[secret.length - NONCE_SIZE];
      System.arraycopy(secret, 0, nonce, 0, nonce.length);
      System.arraycopy(secret, NONCE_SIZE, cipher, 0, cipher.length);
      String base64Cipher = Base64.getEncoder().encodeToString(cipher);
      return lazySodiumForDecryption.cryptoSecretBoxOpenEasy(base64Cipher, nonce, Key.fromHexString(hexKey));
    } catch (SodiumException e) {
      throw new SecretBoxDecryptionException(String.format("Could not decrypt secret box '%s'", base64Secret), e);
    }
  }
}
