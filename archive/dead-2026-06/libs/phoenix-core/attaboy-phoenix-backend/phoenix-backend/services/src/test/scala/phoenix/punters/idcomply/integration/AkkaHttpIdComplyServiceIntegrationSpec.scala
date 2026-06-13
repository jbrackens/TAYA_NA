package phoenix.punters.idcomply.integration

import java.time.OffsetDateTime
import java.time.ZoneOffset

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter._
import com.github.tomakehurst.wiremock.client.WireMock._
import org.scalatest.Inspectors.forAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.http.core.AkkaHttpClient
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.SocialSecurityNumber.First5DigitsOfSSN
import phoenix.punters.idcomply.domain.Alert
import phoenix.punters.idcomply.domain.AlertKey
import phoenix.punters.idcomply.domain.AlertMessage
import phoenix.punters.idcomply.domain.Answer
import phoenix.punters.idcomply.domain.AnswerChoices
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenResult
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenWrongRequest
import phoenix.punters.idcomply.domain.GetKBAQuestions.GetKBAQuestionsWrongRequest
import phoenix.punters.idcomply.domain.GetKBAQuestions.KBAQuestionsResult
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.IDPVUserFields
import phoenix.punters.idcomply.domain.IDPVUrl
import phoenix.punters.idcomply.domain.OpenKey
import phoenix.punters.idcomply.domain.Question
import phoenix.punters.idcomply.domain.QuestionId
import phoenix.punters.idcomply.domain.QuestionText
import phoenix.punters.idcomply.domain.RequestKYC.KYCError
import phoenix.punters.idcomply.domain.RequestKYC.KYCErrorKey
import phoenix.punters.idcomply.domain.RequestKYC.KYCMatch
import phoenix.punters.idcomply.domain.RequestKYC.KYCResult
import phoenix.punters.idcomply.domain.RequestKYC.{RequestError => RequestKYCRequestError}
import phoenix.punters.idcomply.domain.SubmitKBAAnswers
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.KBAError
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.SubmitKBAAnswersResult
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.{RequestError => SubmitKBAAnswersRequestError}
import phoenix.punters.idcomply.domain.TokenCreationTime
import phoenix.punters.idcomply.domain.TokenExpirationTime
import phoenix.punters.idcomply.domain.TokenId
import phoenix.punters.idcomply.domain.TransactionId
import phoenix.punters.idcomply.domain.UserFields
import phoenix.punters.idcomply.infrastructure.AkkaHttpIdComplyService
import phoenix.punters.idcomply.infrastructure.ApiKey
import phoenix.punters.idcomply.infrastructure.EndpointPaths
import phoenix.punters.idcomply.infrastructure.IDPVCustomerEndpoint
import phoenix.punters.idcomply.infrastructure.IDPVFrontEndRedirectionEndpoint
import phoenix.punters.idcomply.infrastructure.IdPhotoVerificationCreateTokenEndpointPath
import phoenix.punters.idcomply.infrastructure.IdPhotoVerificationTokenStatusEndpointPath
import phoenix.punters.idcomply.infrastructure.KnowYourCustomerEndpointPath
import phoenix.punters.idcomply.infrastructure.KnowledgeBasedAuthenticationEndpointPath
import phoenix.punters.idcomply.infrastructure.PhotoVerificationBaseUrl
import phoenix.punters.idcomply.infrastructure.RegistrationConfig
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.HttpSpec
import phoenix.support.UnsafeValueObjectExtensions._

final class AkkaHttpIdComplyServiceIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with ActorSystemIntegrationSpec
    with HttpSpec
    with FutureSupport {

  implicit val actorSystem: ActorSystem[Nothing] = system
  implicit val classicSystem = system.toClassic

  lazy val registrationConfig: RegistrationConfig = RegistrationConfig(
    apiKey = ApiKey("some_api_key"),
    idpvEndpoint = IDPVCustomerEndpoint("idpv_endpoint"),
    endpointPaths = EndpointPaths(
      KnowYourCustomerEndpointPath(s"$httpBaseUrl/kyc"),
      KnowledgeBasedAuthenticationEndpointPath(s"$httpBaseUrl/kba"),
      IdPhotoVerificationCreateTokenEndpointPath(s"$httpBaseUrl/idpv"),
      IdPhotoVerificationTokenStatusEndpointPath(s"$httpBaseUrl/token/tokenId/status")),
    PhotoVerificationBaseUrl("https://idcomply.com/idpv-flow"),
    IDPVFrontEndRedirectionEndpoint("https://frontend-redirect-endpoint.com"))

  "request KYC" should {
    val punterId = PunterId("b6126768-00bc-42a9-b0a8-1ba9f0361ee6")
    val userFields = UserFields(
      punterId,
      firstName = UserFields.FirstName("John"),
      lastName = UserFields.LastName("Doe"),
      buildingName = UserFields.BuildingName("Best Street Ever, 34"),
      dobDay = UserFields.DateOfBirthDay(15),
      dobMonth = UserFields.DateOfBirthMonth(5),
      dobYear = UserFields.DateOfBirthYear(1950),
      city = UserFields.City("Rocky Hill"),
      zip = UserFields.ZipCode("06067"),
      country = UserFields.Country("US"),
      state = UserFields.State("New Jersey"),
      ssn = UserFields.LastFourDigitsOfSocialSecurityNumber("1234"))

    val requestBody = """
        |{
        |  "apiKey": "some_api_key",
        |  "userFields": {
        |    "city": "Rocky Hill",
        |    "country": "US",
        |    "dobDay": 15,
        |    "dobMonth": 5,
        |    "dobYear": 1950,
        |    "firstName": "John",
        |    "lastName": "Doe",
        |    "ssn": "1234",
        |    "state": "New Jersey",
        |    "buildingName": "Best Street Ever, 34",
        |    "userId": "b6126768-00bc-42a9-b0a8-1ba9f0361ee6",
        |    "zip": "06067"
        |  }
        |}
        |""".stripMargin

    "return a successful result for a full match" in {
      val responseBody =
        """
          |{
          |    "result": {
          |        "transactionId": "fd62b471d53ec26e",
          |        "applicantId": "11e34bae-19d7-4554-8d41-31ea7ac76923",
          |        "summary": {
          |            "match": "full",
          |            "message": "Applicant full match",
          |            "ssn5": "41854"
          |        },
          |        "gupiId": "91ed6b05837f2ec03e273475e899fc9580adea8bdad8241eff90ab3a5da352f7",
          |        "details": []
          |    }
          |}
          |""".stripMargin

      stubFor(
        post(urlEqualTo("/kyc"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val idComplyService =
        new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      val kycResult = awaitRight(idComplyService.requestKYC(userFields))
      val expectedResult =
        KYCResult(
          KYCMatch.FullMatch(First5DigitsOfSSN.fromString("41854").unsafe()),
          TransactionId("fd62b471d53ec26e"),
          List.empty,
          List.empty)

      kycResult shouldBe expectedResult
    }

    "return a successful result for a partial match" in {
      val responseBody =
        """
          |{
          |    "result": {
          |        "transactionId": "fd62b471d53ec26e",
          |        "applicantId": "11e34bae-19d7-4554-8d41-31ea7ac76923",
          |        "summary": {
          |            "match": "partial",
          |            "message": "Applicant partial match"
          |        },
          |        "gupiId": "91ed6b05837f2ec03e273475e899fc9580adea8bdad8241eff90ab3a5da352f7",
          |        "details": []
          |    }
          |}
          |""".stripMargin

      stubFor(
        post(urlEqualTo("/kyc"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val idComplyService =
        new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      val kycResult = awaitRight(idComplyService.requestKYC(userFields))
      val expectedResult = KYCResult(KYCMatch.PartialMatch, TransactionId("fd62b471d53ec26e"), List.empty, List.empty)

      kycResult shouldBe expectedResult
    }

    "return a successful result for a failed match" in {
      val responseBody =
        """
          |{
          |    "result": {
          |        "transactionId": "a70d041ae75f98c6",
          |        "applicantId": "5f6551c4-f2ad-4647-ac30-bf6db78702bb",
          |        "summary": {
          |            "match": "fail",
          |            "message": "No applicant's match"
          |        },
          |        "details": []
          |    }
          |}
          |""".stripMargin

      stubFor(
        post(urlEqualTo("/kyc"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val idComplyService =
        new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      val kycResult = awaitRight(idComplyService.requestKYC(userFields))
      val expectedResult = KYCResult(KYCMatch.FailMatch, TransactionId("a70d041ae75f98c6"), List.empty, List.empty)

      kycResult shouldBe expectedResult
    }
    forAll(
      Seq(
        "country.empty" -> KYCErrorKey.CountryInvalid,
        "country.invalid" -> KYCErrorKey.CountryInvalid,
        "city.empty" -> KYCErrorKey.CityInvalid,
        "city.invalid" -> KYCErrorKey.CityInvalid,
        "firstName.empty" -> KYCErrorKey.FirstNameInvalid,
        "firstName.invalid" -> KYCErrorKey.FirstNameInvalid,
        "lastName.empty" -> KYCErrorKey.LastNameInvalid,
        "lastName.invalid" -> KYCErrorKey.LastNameInvalid,
        "userId.empty" -> KYCErrorKey.UserIdInvalid,
        "dob.empty" -> KYCErrorKey.DobInvalid,
        "dob.invalid" -> KYCErrorKey.DobInvalid,
        "dobYear.empty" -> KYCErrorKey.DobYearInvalid,
        "dobYear.invalid" -> KYCErrorKey.DobYearInvalid,
        "zip.empty" -> KYCErrorKey.ZipInvalid,
        "zip.invalid" -> KYCErrorKey.ZipInvalid,
        "ssn.empty" -> KYCErrorKey.SsnInvalid,
        "ssn.invalid" -> KYCErrorKey.SsnInvalid,
        "idNumber.empty" -> KYCErrorKey.IdNumberInvalid,
        "idNumber.invalid" -> KYCErrorKey.IdNumberInvalid,
        "unknown" -> KYCErrorKey.UnknownError)) {
      case (responseKey, errorKey) =>
        s"should fail with $responseKey error" in {
          val responseBody =
            s"""
          |{
          |  "error": {
          |    "key": "$responseKey",
          |    "message": "A message"
          |  }
          |}
          |""".stripMargin

          stubFor(
            post(urlEqualTo("/kyc"))
              .withRequestBody(equalToJson(requestBody))
              .willReturn(
                aResponse().withStatus(400).withBody(responseBody).withHeader("Content-Type", "application/json")))

          val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

          val kycError = awaitLeft(client.requestKYC(userFields))
          kycError shouldBe KYCError.WrongRequest(RequestKYCRequestError(errorKey, "A message"))
        }
    }

    "should fail with an alert" in {
      val responseBody =
        """
          |{
          |  "result": {
          |    "transactionId": "912593196aa752c2",
          |    "applicantId": "ad4406cf-ed91-457f-943f-e6ed7bcbf77d",
          |    "summary": {
          |      "match": "fail",
          |      "message": "No applicant's match",
          |      "ssn5": "28727"
          |    },
          |    "alerts": [
          |      {
          |        "key": "list.mortality",
          |        "message": "Applicant is found in mortality lists"
          |      }
          |    ],
          |    "gupiId":"b8eec31f1417e31328965137f5259b0d38fd232d0ac1bc9761bef82ecab96fa7",
          |    "details": []
          |  }
          |}
          |""".stripMargin

      stubFor(
        post(urlEqualTo("/kyc"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      val kycResult = awaitRight(client.requestKYC(userFields))
      kycResult shouldBe
      KYCResult(
        KYCMatch.FailMatch,
        TransactionId("912593196aa752c2"),
        List(Alert(AlertKey("list.mortality"), AlertMessage("Applicant is found in mortality lists"))),
        List.empty)
    }
  }

  "request KBA questions" should {
    val punterId = PunterId("b6126768-00bc-42a9-b0a8-1ba9f0361ee6")
    val userFields = UserFields(
      punterId,
      firstName = UserFields.FirstName("John"),
      lastName = UserFields.LastName("Doe"),
      buildingName = UserFields.BuildingName("Best Street Ever, 34"),
      dobDay = UserFields.DateOfBirthDay(15),
      dobMonth = UserFields.DateOfBirthMonth(5),
      dobYear = UserFields.DateOfBirthYear(1950),
      city = UserFields.City("Rocky Hill"),
      zip = UserFields.ZipCode("06067"),
      country = UserFields.Country("US"),
      state = UserFields.State("New Jersey"),
      ssn = UserFields.LastFourDigitsOfSocialSecurityNumber("1234"))
    val transactionId = TransactionId("6wXygxk6AceY6Y5eeLDa5QWZSvFU4nLE")

    val requestBody = """
        |{
        |  "apiKey": "some_api_key",
        |  "dataTransactionId": "6wXygxk6AceY6Y5eeLDa5QWZSvFU4nLE",
        |  "userFields": {
        |    "userId": "b6126768-00bc-42a9-b0a8-1ba9f0361ee6",
        |    "firstName": "John",
        |    "lastName": "Doe",
        |    "dobYear": 1950,
        |    "dobMonth": 5,
        |    "dobDay": 15,
        |    "zip": "06067",
        |    "country": "US",
        |    "state": "New Jersey",
        |    "ssn": "1234",
        |    "city": "Rocky Hill",
        |    "buildingName": "Best Street Ever, 34"
        |  }
        |}
        |""".stripMargin

    "return a successful full match result" in {
      val responseBody = """
          |{
          |  "result": {
          |    "transactionId": "999eb82297cb2ab9",
          |    "applicantId": "9eccbfdb-2542-49c1-8eb4-46e62afba0c3",
          |    "gupiId":"ef2ffde554e3ac96e6d5a5a816fd60c520d27d80b89e9443aa2fc0e3c81023a0",
          |    "summary": {
          |      "match": "full",
          |      "message": "Applicant full match",
          |      "ssn5": "28727"
          |    },
          |    "details": [],
          |    "questions" : [
          |      {
          |        "questionId":"0",
          |        "text":"What is the zip code of your previous place of living?",
          |        "choices":["12345", "67890", "45678", "None of the above"]
          |      },
          |      {
          |        "questionId":"1",
          |        "text":"Which country do you live in?",
          |        "choices":["US", "Italy", "Canada", "None of the above"]
          |      }
          |    ]
          |  }
          |}
          |""".stripMargin

      stubFor(
        post(urlEqualTo("/kba"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      val kbaQuestionsResult =
        awaitRight(client.getKBAQuestions(transactionId, userFields))
      val expectedResult = KBAQuestionsResult.FullMatch(
        TransactionId("999eb82297cb2ab9"),
        List(
          Question(
            QuestionId("0"),
            QuestionText("What is the zip code of your previous place of living?"),
            AnswerChoices(List("12345", "67890", "45678", "None of the above"))),
          Question(
            QuestionId("1"),
            QuestionText("Which country do you live in?"),
            AnswerChoices(List("US", "Italy", "Canada", "None of the above")))))

      kbaQuestionsResult shouldBe expectedResult
    }

    "return a successful fail match result" in {
      val responseBody =
        """
          |{
          |"result": {
          |    "transactionId": "999eb82297cb2ab9",
          |    "applicantId": "9eccbfdb-2542-49c1-8eb4-46e62afba0c3",
          |    "gupiId":"ef2ffde554e3ac96e6d5a5a816fd60c520d27d80b89e9443aa2fc0e3c81023a0",
          |    "summary": {
          |      "match": "fail",
          |      "message": "No applicant's match"
          |    },
          |    "details": []
          |  }
          |}
          |""".stripMargin

      stubFor(post(urlEqualTo("/kba"))
        .withRequestBody(equalToJson(requestBody))
        .willReturn(aResponse().withStatus(200).withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      val kbaQuestionsResult =
        awaitRight(client.getKBAQuestions(transactionId, userFields))

      val expectedResult = KBAQuestionsResult.FailMatch("No applicant's match")
      kbaQuestionsResult shouldBe expectedResult
    }

    "should fail with an error" in {
      val responseBody = """
          |{
          |  "error": {
          |    "key": "person.deceased",
          |    "message": "Requested person is in mortality lists"
          |  }
          |}
          |""".stripMargin

      stubFor(post(urlEqualTo("/kba"))
        .withRequestBody(equalToJson(requestBody))
        .willReturn(aResponse().withStatus(400).withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      val kbaError =
        awaitLeft(client.getKBAQuestions(transactionId, userFields))
      kbaError shouldBe GetKBAQuestionsWrongRequest
    }
  }

  "submit KBA answers" should {
    "accept a failure due to wrong questions submitted" in {
      val transactionId = TransactionId("6ccb21b90df6bb37")
      val answers = List(
        Answer(QuestionId("0"), choice = "Black"),
        Answer(QuestionId("1"), choice = "GLADSTONE"),
        Answer(QuestionId("2"), choice = "None of the above"))

      val requestBody = """
          |{
          | "apiKey": "some_api_key",
          | "questionsTransactionId": "6ccb21b90df6bb37",
          | "answers": [
          |   {
          |     "questionId": "0",
          |     "choice": "Black"
          |   },
          |   {
          |     "questionId": "1",
          |     "choice": "GLADSTONE"
          |   },
          |   {
          |     "questionId": "2",
          |     "choice": "None of the above"
          |   }
          | ]
          |}""".stripMargin

      val responseBody = """
          |{
          |    "error": {
          |        "key": "answers.invalid",
          |        "message": "Hopefully this message doesn't matter, otherwise search for an example of it"
          |    }
          |}
          |""".stripMargin

      stubFor(post(urlEqualTo("/kba"))
        .withRequestBody(equalToJson(requestBody))
        .willReturn(aResponse().withStatus(400).withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      awaitLeft(client.submitKBAAnswers(transactionId, answers)) shouldBe KBAError.WrongRequest(
        SubmitKBAAnswersRequestError(
          SubmitKBAAnswers.KBAErrorKey.UnknownError,
          "Hopefully this message doesn't matter, otherwise search for an example of it"))
    }

    "accept a partial match answer" in {
      val transactionId = TransactionId("6ccb21b90df6bb37")
      val answers = List(
        Answer(QuestionId("0"), choice = "Black"),
        Answer(QuestionId("1"), choice = "GLADSTONE"),
        Answer(QuestionId("2"), choice = "None of the above"))

      val requestBody = """
          |{
          | "apiKey": "some_api_key",
          | "questionsTransactionId": "6ccb21b90df6bb37",
          | "answers": [
          |   {
          |     "questionId": "0",
          |     "choice": "Black"
          |   },
          |   {
          |     "questionId": "1",
          |     "choice": "GLADSTONE"
          |   },
          |   {
          |     "questionId": "2",
          |     "choice": "None of the above"
          |   }
          | ]
          |}""".stripMargin

      val responseBody = """
          |{
          |    "result": {
          |        "transactionId": "f7b33b7f1a31be56",
          |        "applicantId": "e56e0a8a-33be-44a1-8423-94e5d3ebd0a1",
          |        "summary": {
          |            "match": "partial",
          |            "message": "Applicant's data is matched partial"
          |        },
          |        "gupiId": "91ed6b05837f2ec03e273475e899fc9580adea8bdad8241eff90ab3a5da352f7",
          |        "questions": [
          |            {
          |                "text": "In which zip code have you previously lived?",
          |                "choices": [
          |                    "36101",
          |                    "33971",
          |                    "35425",
          |                    "None of the above"
          |                ],
          |                "questionId": "0"
          |            }
          |        ],
          |        "details": []
          |    }
          |}
          |""".stripMargin

      stubFor(
        post(urlEqualTo("/kba"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      awaitRight(client.submitKBAAnswers(transactionId, answers)) shouldBe SubmitKBAAnswersResult.PartialMatch(
        TransactionId("f7b33b7f1a31be56"),
        List(
          Question(
            QuestionId("0"),
            QuestionText("In which zip code have you previously lived?"),
            AnswerChoices(List("36101", "33971", "35425", "None of the above")))))
    }

    "accept a full match answer" in {
      val transactionId = TransactionId("73cf54771d01e8bc")
      val answers = List(Answer(QuestionId("0"), choice = "NEWPORT NEWS CITY"))

      val requestBody = """
          |{
          | "apiKey":"some_api_key",
          | "questionsTransactionId": "73cf54771d01e8bc",
          | "answers": [
          |   {
          |     "questionId": "0",
          |     "choice":"NEWPORT NEWS CITY"
          |   }
          | ]
          |}""".stripMargin

      val responseBody = """
          |{
          |    "result": {
          |        "transactionId": "1f0f20b12541d698",
          |        "applicantId": "e56e0a8a-33be-44a1-8423-94e5d3ebd0a1",
          |        "summary": {
          |            "match": "full",
          |            "message": "Applicant full match"
          |        },
          |        "gupiId": "91ed6b05837f2ec03e273475e899fc9580adea8bdad8241eff90ab3a5da352f7",
          |        "details": []
          |    }
          |}
          |""".stripMargin

      stubFor(
        post(urlEqualTo("/kba"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      awaitRight(client.submitKBAAnswers(transactionId, answers)) shouldBe SubmitKBAAnswersResult.FullMatch
    }

    "accept a fail match" in {
      val transactionId = TransactionId("73cf54771d01e8bc")
      val answers = List(Answer(QuestionId("0"), choice = "NEWPORT NEWS CITY"))

      val requestBody = """
          |{
          | "apiKey":"some_api_key",
          | "questionsTransactionId": "73cf54771d01e8bc",
          | "answers": [
          |   {
          |     "questionId": "0",
          |     "choice":"NEWPORT NEWS CITY"
          |   }
          | ]
          |}""".stripMargin

      val responseBody = """
          |{
          |    "result": {
          |        "transactionId": "1f0f20b12541d698",
          |        "applicantId": "e56e0a8a-33be-44a1-8423-94e5d3ebd0a1",
          |        "summary": {
          |            "match": "fail",
          |            "message": "Some message we don't care about"
          |        },
          |        "gupiId": "91ed6b05837f2ec03e273475e899fc9580adea8bdad8241eff90ab3a5da352f7",
          |        "details": []
          |    }
          |}
          |""".stripMargin

      stubFor(
        post(urlEqualTo("/kba"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      awaitRight(client.submitKBAAnswers(transactionId, answers)) shouldBe SubmitKBAAnswersResult.FailMatch
    }
  }

  "get IDPV token" should {
    "create a new token" in {
      val punterId = PunterId("ef4a37cb-3fb1-4393-9abc-b21c098a4dc9")

      val requestBody = """
          |{
          |  "apiKey": "some_api_key",
          |  "tokenData": {
          |    "redirectUrl": "https://frontend-redirect-endpoint.com?showModal=IDCOMPLY&punterId=ef4a37cb-3fb1-4393-9abc-b21c098a4dc9",
          |    "endpoint": "idpv_endpoint",
          |    "userId": "ef4a37cb-3fb1-4393-9abc-b21c098a4dc9"
          |  }
          |}""".stripMargin

      val responseBody = """
          |{
          |    "result": {
          |        "token": "feaf89ce3235562d",
          |        "openKey": "a828d769",
          |        "status": "created",
          |        "creationTime": "2021-05-28T12:01:28+0000",
          |        "expirationTime": "2021-05-28T12:31:28+0000"
          |    }
          |}
          |""".stripMargin

      stubFor(post(urlEqualTo("/idpv"))
        .withRequestBody(equalToJson(requestBody))
        .willReturn(aResponse().withStatus(201).withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      awaitRight(client.createIDPVToken(punterId)) shouldBe CreateIDPVTokenResult(
        TokenId("feaf89ce3235562d"),
        OpenKey("a828d769"),
        TokenCreationTime(OffsetDateTime.of(2021, 5, 28, 12, 1, 28, 0, ZoneOffset.UTC)),
        TokenExpirationTime(OffsetDateTime.of(2021, 5, 28, 12, 31, 28, 0, ZoneOffset.UTC)))
    }

    "fail when getting a failure response" in {
      val punterId = PunterId("ef4a37cb-3fb1-4393-9abc-b21c098a4dc9")

      val requestBody = """
          |{
          |  "apiKey": "some_api_key",
          |  "tokenData": {
          |    "redirectUrl": "https://frontend-redirect-endpoint.com?showModal=IDCOMPLY&punterId=ef4a37cb-3fb1-4393-9abc-b21c098a4dc9",
          |    "endpoint": "idpv_endpoint",
          |    "userId": "ef4a37cb-3fb1-4393-9abc-b21c098a4dc9"
          |  }
          |}""".stripMargin

      val responseBody = """
          |{
          |    "error": {
          |        "key": "person.deceased",
          |        "message": "Requested person is in mortality lists"
          |    }
          |}
          |""".stripMargin

      stubFor(post(urlEqualTo("/idpv"))
        .withRequestBody(equalToJson(requestBody))
        .willReturn(aResponse().withStatus(400).withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      awaitLeft(client.createIDPVToken(punterId)) shouldBe CreateIDPVTokenWrongRequest
    }
  }

  "creating an IDPD URL" should {
    "return the correct format" in {
      val tokenId = TokenId("feaf89ce3235562d")
      val openKey = OpenKey("a828d769")

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      val url = client.createIDPVUrl(tokenId, openKey)
      url shouldBe IDPVUrl("https://idcomply.com/idpv-flow?token=feaf89ce3235562d&oKey=a828d769")
    }
  }

  "getting the IDPV token status" should {
    val tokenId = TokenId("a79fe957-6633-419c-99f2-5693283d94d2")

    val requestBody = """
        |{
        |  "apiKey": "some_api_key"
        |}""".stripMargin

    "accept a 'created' token status response" in {
      val responseBody = """
          |{
          |    "result": {
          |        "status": "created",
          |        "match": null
          |    }
          |}
          |""".stripMargin

      stubFor(
        get(urlEqualTo("/token/a79fe957-6633-419c-99f2-5693283d94d2/status"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      await(client.getIDPVTokenStatus(tokenId)) shouldBe IDPVTokenStatusResponse.Created
    }

    "accept a 'activated' token status response" in {
      val responseBody = """
          |{
          |    "result": {
          |        "status": "activated",
          |        "match": null
          |    }
          |}
          |""".stripMargin

      stubFor(
        get(urlEqualTo("/token/a79fe957-6633-419c-99f2-5693283d94d2/status"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      await(client.getIDPVTokenStatus(tokenId)) shouldBe IDPVTokenStatusResponse.Activated
    }

    "accept a 'archived' token status response" in {
      val responseBody = """
          |{
          |    "result": {
          |        "status": "archived",
          |        "match": null
          |    }
          |}
          |""".stripMargin

      stubFor(
        get(urlEqualTo("/token/a79fe957-6633-419c-99f2-5693283d94d2/status"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      await(client.getIDPVTokenStatus(tokenId)) shouldBe IDPVTokenStatusResponse.Archived
    }

    "accept a 'correct' token status response with fail match" in {
      val responseBody = """
          |{
          |    "result": {
          |        "status": "complete",
          |        "match": "fail"
          |    }
          |}
          |""".stripMargin

      stubFor(
        get(urlEqualTo("/token/a79fe957-6633-419c-99f2-5693283d94d2/status"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      await(client.getIDPVTokenStatus(tokenId)) shouldBe IDPVTokenStatusResponse.FailMatch
    }

    "accept a 'correct' token status response with partial match" in {
      val responseBody = """
          |{
          |    "result": {
          |        "status": "complete",
          |        "match": "partial"
          |    }
          |}
          |""".stripMargin

      stubFor(
        get(urlEqualTo("/token/a79fe957-6633-419c-99f2-5693283d94d2/status"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      await(client.getIDPVTokenStatus(tokenId)) shouldBe IDPVTokenStatusResponse.PartialMatch
    }

    "accept a 'correct' token status response with full match" in {
      val responseBody = """
          |{
          |    "result": {
          |        "status": "complete",
          |        "match": "full",
          |        "userFields": {
          |            "firstName": "BOB",
          |            "lastName": "SMITH",
          |            "givenName": "BOB J",
          |            "fullName": "BOB J SMITH",
          |            "address": "2 ROCKWELL DR",
          |            "city": "LAGRANGE",
          |            "zip": "30240-9713",
          |            "country": "US",
          |            "idNumber": "053274450",
          |            "idType": "drivingLicense",
          |            "dobDay": "01",
          |            "dobMonth": "02",
          |            "dobYear": "1995",
          |            "expirationDay": "01",
          |            "expirationMonth": "02",
          |            "expirationYear": "2026",
          |            "issueDay": "05",
          |            "issueMonth": "02",
          |            "issueYear": "2018",
          |            "ssn": "123456789"
          |        }
          |    }
          |}
          |""".stripMargin

      stubFor(
        get(urlEqualTo("/token/a79fe957-6633-419c-99f2-5693283d94d2/status"))
          .withRequestBody(equalToJson(requestBody))
          .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "application/json")))

      val client = new AkkaHttpIdComplyService(new AkkaHttpClient(classicSystem), registrationConfig)

      await(client.getIDPVTokenStatus(tokenId)) shouldBe IDPVTokenStatusResponse.FullMatch(
        Some(IDPVUserFields.FirstName("BOB")),
        IDPVUserFields.LastName("SMITH"),
        Some(IDPVUserFields.GivenName("BOB J")),
        Some(IDPVUserFields.FullName("BOB J SMITH")),
        Some(IDPVUserFields.Address("2 ROCKWELL DR")),
        Some(IDPVUserFields.City("LAGRANGE")),
        Some(IDPVUserFields.Zip("30240-9713")),
        Some(IDPVUserFields.Country("US")),
        IDPVUserFields.IdNumber("053274450"),
        IDPVUserFields.IdType("drivingLicense"),
        IDPVUserFields.DobDay(1),
        IDPVUserFields.DobMonth(2),
        IDPVUserFields.DobYear(1995),
        IDPVUserFields.ExpirationDay("01"),
        IDPVUserFields.ExpirationMonth("02"),
        IDPVUserFields.ExpirationYear("2026"),
        IDPVUserFields.IssueDay("05"),
        IDPVUserFields.IssueMonth("02"),
        IDPVUserFields.IssueYear("2018"),
        IDPVUserFields.SSN("123456789"))
    }
  }
}
