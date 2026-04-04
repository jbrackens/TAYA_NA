package stella.common.http.jwt

import scala.concurrent.Future

import org.jose4j.jwk.JsonWebKey

trait OidcPropertiesProvider {

  /** In case of failure, the only expected error is OidcPropertyLookupError */
  def getIssuer(realm: String): Future[String]

  /** In case of failure, the only expected error is OidcPropertyLookupError */
  def getJsonWebKey(
      realm: String,
      keyId: String,
      expectedUse: String,
      expectedAlgorithm: String): Future[Option[JsonWebKey]]
}

final case class OidcPropertyLookupError private (message: String, cause: Option[Throwable])
    extends Exception(message, cause.orNull)

object OidcPropertyLookupError {
  def apply(message: String): OidcPropertyLookupError = OidcPropertyLookupError(message, None)
  def apply(message: String, cause: Throwable): OidcPropertyLookupError = OidcPropertyLookupError(message, Some(cause))
}
