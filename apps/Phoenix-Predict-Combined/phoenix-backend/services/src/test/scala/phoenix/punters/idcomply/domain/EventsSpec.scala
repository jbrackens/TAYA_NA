package phoenix.punters.idcomply.domain
import java.time.OffsetDateTime

import io.circe.literal._
import io.circe.syntax._
import io.scalaland.chimney.dsl._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.idcomply.domain.Events.KYCResultEventData
import phoenix.punters.idcomply.domain.Events.PunterGotSuccessfulKYCResponse
import phoenix.punters.idcomply.domain.Events.SignUpEventData
import phoenix.punters.idcomply.infrastructure.RegistrationJsonFormats._
import phoenix.punters.idcomply.support.RegistrationDataGenerator._
import phoenix.punters.infrastructure.PunterJsonFormats._

class EventsSpec extends AnyWordSpecLike with Matchers with ScalaCheckDrivenPropertyChecks {

  "SignUpEventData transformer" should {
    "correctly transform from SignUpRequest" in {
      val signUpRequest = generateSignUpRequest()
      val transformed = signUpRequest.transformInto[SignUpEventData]

      transformed shouldBe SignUpEventData(
        name = signUpRequest.name,
        username = signUpRequest.username,
        email = signUpRequest.email,
        phoneNumber = signUpRequest.phoneNumber,
        address = signUpRequest.address,
        dateOfBirth = signUpRequest.dateOfBirth,
        gender = signUpRequest.gender,
        ssn = signUpRequest.ssn,
        referralCode = signUpRequest.referralCode)
    }

    "read json created by SignUpRequest" in {
      (0 to 1000).foreach { _ =>
        val signUpRequest = generateSignUpRequest()
        val json = signUpRequest.asJson
        json.as[SignUpEventData].toOption.get should ===(signUpRequest.transformInto[SignUpEventData])
      }
    }

    "read existing FAIL_MATCH payload" in {
      val json =
        json"""{"type": "punterGotSuccessfulKycResponse", "punterId": "c7916ad7-a252-41f3-167d-28e9a3b7fb39", "createdAt": "2022-01-25T13:36:12.405343-05:00", "kycResult": {"type": "FAIL_MATCH"}}"""

      json.as[PunterGotSuccessfulKYCResponse] should ===(
        Right(PunterGotSuccessfulKYCResponse(
          PunterId("c7916ad7-a252-41f3-167d-28e9a3b7fb39"),
          OffsetDateTime.parse("2022-01-25T13:36:12.405343-05:00"),
          KYCResultEventData.FailMatchEventData(List(), List()))))
    }

    "read existing FULL_MATCH payload" in {
      val json =
        json"""{"type": "punterGotSuccessfulKycResponse", "punterId": "62a234d2-d4f7-43019-8268-961af90936b4", "createdAt": "2022-01-26T10:23:53.8224544-05:00", "kycResult": {"type": "FULL_MATCH", "transactionId": "228576c2c3c5b378", "firstFiveDigitsSSN": "04292"}}"""

      json.as[PunterGotSuccessfulKYCResponse] should ===(
        Right(PunterGotSuccessfulKYCResponse(
          PunterId("62a234d2-d4f7-43019-8268-961af90936b4"),
          OffsetDateTime.parse("2022-01-26T10:23:53.8224544-05:00"),
          KYCResultEventData.FullMatchEventData(TransactionId("228576c2c3c5b378")))))
    }

    "read existing PARTIAL_MATCH payload" in {
      val json =
        json"""{"type": "punterGotSuccessfulKycResponse", "punterId": "812263a7-84f3-464d-a64e-1c1a4fb560d7", "createdAt": "2022-02-25T08:18:55.557689-05:00", "kycResult": {"type": "PARTIAL_MATCH"}}"""

      json.as[PunterGotSuccessfulKYCResponse] should ===(
        Right(PunterGotSuccessfulKYCResponse(
          PunterId("812263a7-84f3-464d-a64e-1c1a4fb560d7"),
          OffsetDateTime.parse("2022-02-25T08:18:55.557689-05:00"),
          KYCResultEventData.PartialMatchEventData(List(), List()))))
    }
  }
}
