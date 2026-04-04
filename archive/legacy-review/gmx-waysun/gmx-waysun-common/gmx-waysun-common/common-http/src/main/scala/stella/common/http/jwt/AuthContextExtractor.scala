package stella.common.http.jwt

import org.jose4j.jwt.JwtClaims

import stella.common.http.jwt.JwtAuthorization.InvalidAuthTokenError

trait AuthContextExtractor[AC <: AuthContext] {
  def extract(claims: JwtClaims): Either[InvalidAuthTokenError, AC]
}
