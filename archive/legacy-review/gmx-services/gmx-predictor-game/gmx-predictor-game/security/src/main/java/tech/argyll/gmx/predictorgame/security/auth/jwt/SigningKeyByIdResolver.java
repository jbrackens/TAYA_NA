package tech.argyll.gmx.predictorgame.security.auth.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwsHeader;
import io.jsonwebtoken.SigningKeyResolverAdapter;

import java.security.Key;

public class SigningKeyByIdResolver extends SigningKeyResolverAdapter {

  @Override
  public Key resolveSigningKey(JwsHeader header, Claims claims) {
    return lookupByKey(header.getKeyId());
  }

  @Override
  public Key resolveSigningKey(JwsHeader header, String plaintext) {
    return lookupByKey(header.getKeyId());
  }

  protected Key lookupByKey(String keyId) {
    throw new IllegalStateException("Should be overridden!!");
  }

}
