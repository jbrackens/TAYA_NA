package phoenix

import scala.concurrent.Future

import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.headers.BasicHttpCredentials
import akka.http.scaladsl.model.headers.OAuth2BearerToken
import io.circe.Codec
import io.circe.Decoder
import io.circe.HCursor
import io.circe.Json
import io.circe.generic.semiauto.deriveCodec

trait AuthRequests extends AuthFormats with HttpSupport {

  private lazy val phoenixConfig = Config.instance.phoenix

  def signUp(user: User): Future[HttpResponse] = {
    val request = SignUpRequest(
      user.name,
      user.credentials.username,
      user.email,
      user.phoneNumber,
      user.credentials.password,
      user.address,
      user.dateOfBirth,
      user.gender,
      user.ssn,
      twoFactorAuthEnabled = false,
      referralCode = None,
      deviceFingerprint = DeviceFingerprint("jp2gmd", "0.00"))
    log.info(s"Requesting sign up for user ${request.username}")

    postNoReturn[SignUpRequest](
      s"${phoenixConfig.devApiUrl}/test-account-sign-up",
      request,
      Authorization(
        BasicHttpCredentials(phoenixConfig.devApiCredentials.username, phoenixConfig.devApiCredentials.password)))
  }

  def signIn(credentials: UserCredentials): Future[SignInResponse] = {
    val request = SignInRequest(
      credentials.username,
      credentials.password,
      rememberMe = false,
      deviceFingerprint = DeviceFingerprint("jp2gmd", "0.00"))
    log.info(s"Requesting sign in for user ${request.username}")

    postCodec[SignInRequest, SignInResponse](s"${phoenixConfig.publicApiUrl}/login", request)
  }

  def me(accessToken: String): Future[MeResponse] = {
    log.info("Requesting profile information for user...")

    getCodec[MeResponse](s"${phoenixConfig.publicApiUrl}/profile/me", Authorization(OAuth2BearerToken(accessToken)))
  }
}

trait AuthFormats {
  case class SignUpRequest(
      name: PersonalName,
      username: String,
      email: String,
      phoneNumber: String,
      password: String,
      address: Address,
      dateOfBirth: DateOfBirth,
      gender: Option[Gender],
      ssn: String,
      twoFactorAuthEnabled: Boolean,
      referralCode: Option[String],
      deviceFingerprint: DeviceFingerprint)

  case class SignInRequest(
      username: String,
      password: String,
      rememberMe: Boolean,
      deviceFingerprint: DeviceFingerprint)
  object SignInRequest {
    def fromCredentials(credentials: UserCredentials, rememberMe: Boolean = false): SignInRequest =
      SignInRequest(credentials.username, credentials.password, rememberMe, DeviceFingerprint("jp2gmd", "0.00"))
  }
  case class SignInResponse(token: AuthToken)

  case class MeResponse(userId: String, username: String)

  implicit val personalNameCodec: Codec[PersonalName] = deriveCodec
  implicit val addressCodec: Codec[Address] = deriveCodec
  implicit val dateOfBirthCodec: Codec[DateOfBirth] = deriveCodec
  implicit val genderCodec: Codec[Gender] = new Codec[Gender] {
    override def apply(c: HCursor): Decoder.Result[Gender] = c.as[String].map(Gender)
    override def apply(gender: Gender): Json = Json.fromString(gender.value)
  }
  implicit val tokenCodec: Codec[AuthToken] = deriveCodec
  implicit val deviceFingerprintCodec: Codec[DeviceFingerprint] = deriveCodec
  implicit val signUpRequestCodec: Codec[SignUpRequest] = deriveCodec
  implicit val signInRequestCodec: Codec[SignInRequest] = deriveCodec
  implicit val signInResponseCodec: Codec[SignInResponse] = deriveCodec
  implicit val meResponseCodec: Codec[MeResponse] = deriveCodec
}
case class AuthToken(token: String, userId: String)
