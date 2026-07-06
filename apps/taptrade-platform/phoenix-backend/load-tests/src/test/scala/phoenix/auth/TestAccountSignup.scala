package phoenix.auth
import scala.util.Random

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import io.gatling.http.request.builder.HttpRequestBuilder

import phoenix.CommonHttpProtocol._
import phoenix.JsonOps._

object TestAccountSignup {
  final case class PersonalName(title: String, firstName: String, lastName: String)
  final case class DateOfBirth(day: Int, month: Int, year: Int)
  final case class Address(addressLine: String, city: String, state: String, zipcode: String, country: String)
  final case class TestSignUpRequest(
      name: PersonalName,
      username: String,
      password: String,
      email: String,
      address: Address,
      phoneNumber: String,
      dateOfBirth: DateOfBirth,
      gender: String,
      ssn: String)
  implicit val dateOfBirthCodec: Codec[DateOfBirth] = deriveCodec
  implicit val addressCodec: Codec[Address] = deriveCodec
  implicit val testSignUpRequestCodec: Codec[TestSignUpRequest] = deriveCodec
  implicit val personalNameCodec: Codec[PersonalName] = deriveCodec

  def generateSSN: Int = Random.between(100000000, 999999999)

  val SignUpRequestKey = "signUpRequest"
  val Password = "1m2e!sssH"

  def getSignUpRequest(session: Session): TestSignUpRequest =
    session(SignUpRequestKey).as[TestSignUpRequest]

  val signUp: HttpRequestBuilder = http("Sign-up")
    .post(s"$devBaseUrl/test-account-sign-up")
    .basicAuth(devUsername, devPassword)
    .asJsonBody(getSignUpRequest)
    .check(status.in(204, 409))

  val signUpRequestFeeder: Iterator[Map[String, TestSignUpRequest]] =
    Iterator.continually {
      Map(SignUpRequestKey -> {
        val ssn = generateSSN.toString
        val address =
          Address(addressLine = "Paddington square 18", city = "City", state = "NJ", zipcode = "07066", country = "US")
        TestSignUpRequest(
          name = PersonalName("Mr", "John", "Doh"),
          username = s"Load_test_$ssn",
          password = Password,
          email = s"load-test_$ssn@example.com",
          address,
          phoneNumber = "012345678",
          dateOfBirth = DateOfBirth(1, 1, 1990),
          gender = "MALE",
          ssn = ssn)
      })
    }
}
