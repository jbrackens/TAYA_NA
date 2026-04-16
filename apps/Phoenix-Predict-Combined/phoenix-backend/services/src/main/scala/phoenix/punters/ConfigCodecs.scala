package phoenix.punters

import com.typesafe.config.ConfigOrigin
import pureconfig.ConfigCursor
import pureconfig.ConfigReader
import pureconfig.ConfigReader.Result
import pureconfig.error.ConfigReaderFailure
import pureconfig.error.ConfigReaderFailures

import phoenix.core.validation.ValidationException
import phoenix.http.routes.EndpointInputs.baseUrl.PhoenixAppBaseUrl
import phoenix.punters.domain.Email

object ConfigCodecs {
  implicit object EmailConfigReader extends ConfigReader[Email] {
    override def from(cursor: ConfigCursor): Result[Email] = {
      cursor.asString.flatMap { emailString =>
        Email
          .fromString(emailString)
          .leftMap(validationErrors => ConfigReaderFailures(new CannotReadEmail(cursor, validationErrors.head)))
          .toEither
      }
    }

    private final class CannotReadEmail(cursor: ConfigCursor, cause: ValidationException) extends ConfigReaderFailure {
      override def description: String = s"Cannot read email address, due to [error = ${cause.message}]"
      override def origin: Option[ConfigOrigin] = cursor.origin
    }
  }

  implicit val PhoenixAppBaseUrlConfigReader: ConfigReader[PhoenixAppBaseUrl] =
    ConfigReader[String].map(PhoenixAppBaseUrl)
  implicit val talonAppBaseUrlConfigReader: ConfigReader[TalonAppBaseUrl] =
    ConfigReader[String].map(TalonAppBaseUrl.apply)
}
