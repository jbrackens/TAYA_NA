package stella.common.http.jwt

import java.util.UUID

import scala.jdk.CollectionConverters._

import cats.syntax.either._
import org.jose4j.json.JsonUtil
import org.jose4j.jwt.JwtClaims

import stella.common.http.crypt.SecretBoxUtils
import stella.common.http.jwt.JwtAuthorization.InvalidAuthTokenError
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

class SecretBoxAuthContextExtractor(hexKey: String) extends AuthContextExtractor[StellaAuthContext] {
  import SecretBoxAuthContextExtractor._

  override def extract(claims: JwtClaims): Either[InvalidAuthTokenError, StellaAuthContext] =
    for {
      encryptedSecretBox <- getClaim(Names.secretBoxName, claims)
      decryptedSecretBox <- SecretBoxUtils
        .decrypt(encryptedSecretBox, hexKey)
        .leftMap(e => InvalidAuthTokenError(e.message, e.cause))
      secretBoxContent <- parseSecretBox(decryptedSecretBox)
      sub <- getClaimAsUuid(Names.sub, claims).map(UserId(_))
      _ <- getClaim(Names.aud, claims) // just to verify existence in the token
      primaryProjectId <- getUuidProperty(Names.primaryProject, secretBoxContent).map(ProjectId(_))
      additionalProjectIds <- getAdditionalProjectIds(secretBoxContent)
      permissions <- getPermissions(secretBoxContent)
    } yield StellaAuthContext(permissions, sub, primaryProjectId, additionalProjectIds)

  private def getClaim(claimName: String, claims: JwtClaims): Either[InvalidAuthTokenError, String] =
    Either.fromOption(
      Option(claims.getClaimValueAsString(claimName)),
      InvalidAuthTokenError(s"`$claimName` claim is missing in $claims"))

  private def getClaimAsUuid(claimName: String, claims: JwtClaims): Either[InvalidAuthTokenError, UUID] =
    getClaim(claimName, claims).flatMap { str =>
      Either
        .catchOnly[IllegalArgumentException](UUID.fromString(str))
        .leftMap(_ => InvalidAuthTokenError(s"A value of claim `$claimName` is `$str` but it should be UUID"))
    }

  private def parseSecretBox(decryptedSecretBox: String): Either[InvalidAuthTokenError, SecretBoxPropsMap] =
    Either
      .catchNonFatal(JsonUtil.parseJson(decryptedSecretBox).asScala.toMap)
      .leftMap(e => InvalidAuthTokenError(s"Secret box content $decryptedSecretBox is not JSON", e))

  private def getUuidProperty(
      propName: String,
      secretBoxContent: SecretBoxPropsMap): Either[InvalidAuthTokenError, UUID] =
    getProperty(propName, secretBoxContent).flatMap { str =>
      Either
        .catchOnly[IllegalArgumentException](UUID.fromString(str))
        .leftMap(_ => InvalidAuthTokenError(s"A value of property `$propName` is `$str` but it should be UUID"))
    }

  private def getProperty(
      propName: String,
      secretBoxContent: SecretBoxPropsMap): Either[InvalidAuthTokenError, String] =
    Either.fromOption(
      secretBoxContent.get(propName).map(_.toString),
      InvalidAuthTokenError(s"Property `$propName` not found"))

  private def getPermissions(
      secretBoxContent: SecretBoxPropsMap): Either[InvalidAuthTokenError, PermissionsCollection] =
    getSetOfStrings(Names.jpk, secretBoxContent).map(PermissionsCollection)

  private def getAdditionalProjectIds(
      secretBoxContent: SecretBoxPropsMap): Either[InvalidAuthTokenError, Set[ProjectId]] =
    getSetOfStrings(Names.additionalProjects, secretBoxContent).flatMap(parseProjectIds)

  private def parseProjectIds(projectIdsStr: Set[String]): Either[InvalidAuthTokenError, Set[ProjectId]] =
    try {
      Right(projectIdsStr.map(idStr => ProjectId(UUID.fromString(idStr))))
    } catch {
      case e: IllegalArgumentException =>
        Left(InvalidAuthTokenError(s"`${Names.additionalProjects}` should contain only UUIDs", e))
    }

  private def getSetOfStrings(
      propName: String,
      secretBoxContent: SecretBoxPropsMap): Either[InvalidAuthTokenError, Set[String]] =
    getProperty(propName, secretBoxContent).flatMap {
      case jsonArrayRegex(permissions) =>
        val parsedValues = permissions.split(',').map(_.trim).toSet
        if (parsedValues.size == 1 && parsedValues.head.isEmpty) Right(Set.empty[String])
        else Right(parsedValues)
      case unexpectedValue =>
        Left(InvalidAuthTokenError(s"Invalid `$propName`. Expected array but was $unexpectedValue"))
    }
}

object SecretBoxAuthContextExtractor {
  private val jsonArrayRegex = """\[(.*)\]""".r

  type SecretBoxPropsMap = Map[String, Any]

  object Names {
    val aud = "aud" // identifies the recipients that the JWT is intended for (audience)
    val jpk = "jpk" // collection of permissions
    val primaryProject = "primaryProject" // project id - user is "logged in" using a context of this project
    val additionalProjects = "additionalProjects" // project ids - user is allowed to access/change also these projects
    val secretBoxName = "extra"
    val sub = "sub" // identifier of the user who sent the request
  }
}
