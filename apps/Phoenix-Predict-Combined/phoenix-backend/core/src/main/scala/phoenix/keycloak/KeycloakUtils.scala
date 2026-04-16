package phoenix.keycloak

import java.time.OffsetDateTime

import scala.jdk.CollectionConverters._
import scala.util.Failure
import scala.util.Success
import scala.util.Try

import cats.syntax.traverse._
import javax.ws.rs.client.ClientRequestContext
import javax.ws.rs.client.ClientRequestFilter
import org.jboss.resteasy.client.jaxrs.ResteasyClient
import org.jboss.resteasy.client.jaxrs.ResteasyClientBuilder
import org.keycloak.OAuth2Constants
import org.keycloak.admin.client.JacksonProvider
import org.keycloak.admin.client.Keycloak
import org.keycloak.admin.client.KeycloakBuilder
import org.keycloak.common.util.KeycloakUriBuilder
import org.keycloak.representations.idm.UserRepresentation

import phoenix.core.TimeUtils.TimeUtilsLongOps
import phoenix.http.TrustingHttpClientProvider
import phoenix.jwt.KeycloakInstallation

object KeycloakUtils extends TrustingHttpClientProvider {

  val DefaultString = "unknown"
  val DefaultInt = 0

  object Groups {
    val Punters = "punters"
  }

  def keycloakFor(installation: KeycloakInstallation): Keycloak =
    KeycloakBuilder
      .builder()
      .serverUrl(installation.authServerUrl)
      .realm(installation.realm)
      .grantType(OAuth2Constants.CLIENT_CREDENTIALS)
      .clientId(installation.clientId)
      .clientSecret(installation.clientSecret)
      .resteasyClient(createClient())
      .build()

  def createClient(): ResteasyClient =
    new ResteasyClientBuilder()
      .sslContext(sslContext)
      .register(classOf[JacksonProvider], 100)
      .disableTrustManager()
      .build()
      .register(new ExactEmailWorkaroundFilter)

  /**
   * In the 15.1.0 version of Keycloak Admin Client, methods that wrap around `GET /{realm}/users` do not expose the full functionality of the endpoint.
   *
   * We need to search for user by email with exact match, but Keycloak Admin Client only provides method doing exact search with username.
   *
   * To circumvent the problem, if you call method [[org.keycloak.admin.client.resource.UsersResource#search(java.lang.String, java.lang.Boolean)]],
   * append `:EMAIL` to first argument and set second argument to `true`,
   * then the method will search for user with the exact mail, instead for the one with the exact username
   *
   * All emails and usernames are lowercase in keycloak and we also lowercase them ourself.
   * Therefore uppercase letters used in suffix `:EMAIL` should never appear in username.
   *
   * TODO (PHXD-2863): Remove when fixed in Keycloak Admin Client
   */
  class ExactEmailWorkaroundFilter extends ClientRequestFilter {
    private val uriPattern = """admin/realms/[a-zA-Z0-9_.+-]+/users$""".r.unanchored
    private val queryPattern = """username=(.*):EMAIL""".r.unanchored
    override def filter(requestContext: ClientRequestContext): Unit = {
      val uri = requestContext.getUri
      if (
        uri.getPath != null && uri.getQuery != null &&
        uriPattern.findFirstIn(uri.getPath).isDefined && uri.getQuery.contains("exact=true")
      ) {
        val nextUri = queryPattern
          .findFirstMatchIn(uri.getQuery)
          .map { regMatch =>
            new KeycloakUriBuilder()
              .uri(uri)
              .replaceQuery("")
              .queryParam("email", regMatch.group(1))
              .queryParam("exact", true)
              .build()
          }
          .getOrElse(uri)
        requestContext.setUri(nextUri)
      }
    }
  }

  implicit class UserRepOps(val self: UserRepresentation) {

    def stringAttributeOrDefault(key: String, default: String = DefaultString): String =
      self.optionalStringAttribute(key).getOrElse(default)

    def intAttributeOrDefault(key: String, default: Int = DefaultInt): Try[Int] =
      self.optionalIntAttribute(key).map(_.getOrElse(default))

    def intAttribute(key: String): Try[Int] =
      self
        .optionalIntAttribute(key)
        .flatMap(
          _.fold[Try[Int]](Failure[Int](UserRepresentationParseError(
            s"Failed parsing $key to int. Does it exist? Is it an int value?")))(Success.apply))

    def longAttribute(key: String): Try[Long] =
      self
        .optionalLongAttribute(key)
        .flatMap(
          _.fold[Try[Long]](Failure[Long](UserRepresentationParseError(
            s"Failed parsing $key to long. Does it exist? Is it a long value?")))(Success.apply))

    def dateTimeAttribute(key: String): Try[OffsetDateTime] =
      longAttribute(key).map(_.toUtcOffsetDateTime)

    def booleanAttributeOrDefault(key: String, default: Boolean): Option[Boolean] =
      Try(self.stringAttributeOrDefault(key, default.toString).toBoolean).toOption

    def optionalDateTimeAttribute(key: String): Try[Option[OffsetDateTime]] =
      self.optionalLongAttribute(key).map { attribute =>
        attribute.map(_.toUtcOffsetDateTime)
      }

    def optionalLongAttribute(key: String): Try[Option[Long]] =
      self.optionalStringAttribute(key).traverse(raw => Try(raw.toLong))

    def optionalIntAttribute(key: String): Try[Option[Int]] =
      self.optionalStringAttribute(key).traverse(raw => Try(raw.toInt))

    def optionalStringAttribute(key: String): Option[String] =
      Option(self.getAttributes)
        .flatMap(attributes => Option(attributes.get(key)))
        .flatMap(_.asScala.headOption)
        .filterNot(_.isBlank)
  }

  final case class UserRepresentationParseError(detail: String) extends RuntimeException(detail)
}
