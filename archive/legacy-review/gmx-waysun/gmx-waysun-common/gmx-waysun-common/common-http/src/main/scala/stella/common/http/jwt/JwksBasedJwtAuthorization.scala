package stella.common.http.jwt

import java.nio.charset.StandardCharsets
import java.util.Base64

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters._
import scala.util.Failure
import scala.util.Success

import cats.data.EitherT
import cats.implicits.catsStdInstancesForFuture
import cats.syntax.either._
import org.jose4j.json.JsonUtil
import org.jose4j.jwa.AlgorithmConstraints.ConstraintType
import org.jose4j.jwk.JsonWebKey
import org.jose4j.jws.AlgorithmIdentifiers
import org.jose4j.jwt.JwtClaims
import org.jose4j.jwt.consumer.InvalidJwtException
import org.jose4j.jwt.consumer.JwtConsumer
import org.jose4j.jwt.consumer.JwtConsumerBuilder

import stella.common.http.BearerToken
import stella.common.http.jwt.JwtAuthorization._
import stella.common.http.jwt.config.JwtConfig

class JwksBasedJwtAuthorization[AC <: AuthContext](
    config: JwtConfig,
    oidcPropertiesProvider: OidcPropertiesProvider,
    authContextExtractor: AuthContextExtractor[AC])
    extends JwtAuthorization[AC] {
  import JwksBasedJwtAuthorization.checkPermissions

  private val rsa256AlgorithmName = "RS256"
  private val signatureKeyUse = "sig"
  private val permittedSignatureSigningAlgorithm = AlgorithmIdentifiers.RSA_USING_SHA256
  private val issRegexPattern = """^https?://.*/auth/realms/(?<realm>[0-9a-z\-]{1,16})$""".r

  /**
   * Verifies JWT structure, dates, signature and extracts permissions to check if at least one of the passed ones is
   * on the list. If requiredPermissions is empty, the permissions check is not needed.
   */
  override def verify(token: BearerToken, requiredPermissions: Seq[Permission])(implicit
      ec: ExecutionContext): EitherT[Future, JwtAuthorizationError, AC] =
    for {
      headerProps <- getJoseHeaderAsMap(token).toEitherT
      payloadProps <- getJwtPayloadAsMap(token).toEitherT
      // additional algorithm check to avoid possible exploits
      _ <- validateAlgorithmInHeader(headerProps).toEitherT
      keyId <- getKeyIdFromHeader(headerProps).toEitherT
      iss <- getIssFromPayload(payloadProps).toEitherT
      realm <- validateIssAndFetchRealm(iss).toEitherT
      jwk <- getJwk(realm, keyId)
      jwtClaims <- validateJwtAndGetClaims(token, jwk, realm)
      authContext <- authContextExtractor.extract(jwtClaims).toEitherT
      _ <- checkPermissions(authContext.permissions, requiredPermissions).toEitherT
    } yield authContext

  private def getJwtPayloadAsMap(token: BearerToken): Either[InvalidAuthTokenError, Map[String, AnyRef]] =
    for {
      encodedPayload <- extractJwtPayloadFromJwt(token)
      encodedPayloadBytes = encodedPayload.getBytes(StandardCharsets.UTF_8)
      decodedPayloadBytes <- decodeBase64Bytes(encodedPayload, encodedPayloadBytes)
      decodedPayload = new String(decodedPayloadBytes, StandardCharsets.UTF_8)
      payloadAsMap <- createMapFromJson(decodedPayload)
    } yield payloadAsMap

  private def getJoseHeaderAsMap(token: BearerToken): Either[InvalidAuthTokenError, Map[String, AnyRef]] =
    for {
      encodedHeader <- extractJoseHeaderFromJwt(token)
      encodedHeaderBytes = encodedHeader.getBytes(StandardCharsets.UTF_8)
      decodedHeaderBytes <- decodeBase64Bytes(encodedHeader, encodedHeaderBytes)
      decodedHeader = new String(decodedHeaderBytes, StandardCharsets.UTF_8)
      headerAsMap <- createMapFromJson(decodedHeader)
    } yield headerAsMap

  private def extractJoseHeaderFromJwt(token: BearerToken): Either[InvalidAuthTokenError, String] =
    Either.fromOption(
      token.rawValue.split('.').headOption,
      InvalidAuthTokenError("Incorrect structure. Dots are missing."))

  private def extractJwtPayloadFromJwt(token: BearerToken): Either[InvalidAuthTokenError, String] =
    Either.fromOption(
      token.rawValue.split('.').toList match {
        case _ :: payload :: _ => Some(payload)
        case _                 => None
      },
      InvalidAuthTokenError("Incorrect structure. Cannot fetch JWT payload portion."))

  private def decodeBase64Bytes(
      encodedHeader: String,
      encodedHeaderBytes: Array[Byte]): Either[InvalidAuthTokenError, Array[Byte]] =
    Either
      .catchNonFatal(Base64.getDecoder.decode(encodedHeaderBytes))
      .leftMap(e => InvalidAuthTokenError(s"Couldn't decode JOSE Header $encodedHeader", e))

  private def createMapFromJson(decodedJson: String): Either[InvalidAuthTokenError, Map[String, AnyRef]] =
    Either
      .catchNonFatal(JsonUtil.parseJson(decodedJson).asScala.toMap)
      .leftMap(e => InvalidAuthTokenError(s"Couldn't parse $decodedJson as JSON", e))

  private def validateAlgorithmInHeader(headerProps: Map[String, AnyRef]): Either[JwtAuthorizationError, Unit] =
    for {
      alg <- Either.fromOption(
        headerProps.get(JwtKeys.algorithm),
        InvalidAuthTokenError(s"${JwtKeys.algorithm} should be specified"))
      _ <- Either.cond(
        alg == rsa256AlgorithmName,
        (),
        InvalidAuthTokenError(s"${JwtKeys.algorithm} was $alg but should be $rsa256AlgorithmName"))
    } yield ()

  private def getKeyIdFromHeader(headerProps: Map[String, AnyRef]): Either[InvalidAuthTokenError, String] =
    Either.fromOption(
      headerProps.get(JwtKeys.keyId).map(_.toString),
      InvalidAuthTokenError(s"${JwtKeys.keyId} should be specified"))

  private def getIssFromPayload(payloadProps: Map[String, AnyRef]): Either[InvalidAuthTokenError, String] =
    Either.fromOption(
      payloadProps.get(JwtKeys.iss).map(_.toString),
      InvalidAuthTokenError(s"${JwtKeys.iss} should be specified"))

  private def validateIssAndFetchRealm(iss: String): Either[JwtAuthorizationError, String] = {
    for {
      issRealm <- Either.fromOption(
        issRegexPattern.findFirstMatchIn(iss).map(_.group("realm")),
        InvalidAuthTokenError(s"${JwtKeys.iss} does not have the correct form to get realm name"))
      _ <- Either.cond(
        iss.toLowerCase.trim.startsWith(config.serviceDiscoveryEndpointUri.toLowerCase.trim),
        (),
        InvalidAuthTokenError(s"${JwtKeys.iss} does not have the same prefix as serviceDiscoveryEndpointUri"))
    } yield issRealm
  }

  private def getJwk(realm: String, keyId: String)(implicit
      ec: ExecutionContext): EitherT[Future, JwtAuthorizationError, JsonWebKey] =
    EitherT(
      oidcPropertiesProvider
        .getJsonWebKey(
          realm = realm,
          keyId = keyId,
          expectedUse = signatureKeyUse,
          expectedAlgorithm = rsa256AlgorithmName)
        .transform {
          case Success(Some(jwk)) => Success(Right(jwk))
          case Success(None)      => Success(Left(InvalidAuthTokenError(s"JWK for $keyId not found")))
          case Failure(e) =>
            Success(Left(JwksLookupError("JWK lookup failed", e)))
        })

  private def validateJwtAndGetClaims(bearerToken: BearerToken, jwk: JsonWebKey, realm: String)(implicit
      ec: ExecutionContext): EitherT[Future, JwtAuthorizationError, JwtClaims] =
    for {
      requiredIssuer <- getRequiredIssuerProperty(realm)
      jwtConsumer = createJwtConsumerBuilderWithRequiredChecks(jwk, requiredIssuer)
      claims <- retrieveJwtClaims(bearerToken, jwtConsumer)
    } yield claims

  private def getRequiredIssuerProperty(realm: String)(implicit
      ec: ExecutionContext): EitherT[Future, ServiceDiscoveryEndpointError, String] =
    EitherT(oidcPropertiesProvider.getIssuer(realm).transform {
      case Success(jsObject) => Success(Right(jsObject))
      case Failure(e) =>
        Success(Left(ServiceDiscoveryEndpointError("Couldn't get required issuer property", e)))
    })

  private def createJwtConsumerBuilderWithRequiredChecks(jwk: JsonWebKey, requiredIssuer: String): JwtConsumer =
    new JwtConsumerBuilder()
      .setRequireExpirationTime()
      .setRequireIssuedAt()
      .setRequireSubject()
      .setExpectedIssuer(requiredIssuer)
      .setVerificationKey(jwk.getKey)
      .setJwsAlgorithmConstraints(ConstraintType.PERMIT, permittedSignatureSigningAlgorithm)
      .setSkipDefaultAudienceValidation()
      .build()

  private def retrieveJwtClaims(bearerToken: BearerToken, jwtConsumer: JwtConsumer)(implicit
      ec: ExecutionContext): EitherT[Future, JwtAuthorizationError, JwtClaims] =
    Either
      .catchNonFatal {
        jwtConsumer.processToClaims(bearerToken.rawValue)
      }
      .leftMap {
        case e: InvalidJwtException if e.hasExpired =>
          // it was needed to help the compiler to find a proper supertype
          InactiveAuthTokenError.asInstanceOf[JwtAuthorizationError]
        case e =>
          InvalidAuthTokenError("Token parsing and verification failed", e)
      }
      .toEitherT
}

object JwksBasedJwtAuthorization {

  private[common] def checkPermissions(
      permissions: Permissions,
      requiredPermissions: Seq[Permission]): Either[JwtAuthorizationError, Unit] = {
    val userPermitted = requiredPermissions.isEmpty || requiredPermissions.exists(permissions.hasPermission)
    Either.cond(
      userPermitted,
      (),
      MissingPermissionsError(
        s"Missing permissions. Required one of [${requiredPermissions.map(_.value).mkString(", ")}] but was $permissions"))
  }
}
