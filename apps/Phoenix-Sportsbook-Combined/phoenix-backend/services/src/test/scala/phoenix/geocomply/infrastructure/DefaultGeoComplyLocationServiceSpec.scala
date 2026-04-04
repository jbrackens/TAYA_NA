package phoenix.geocomply.infrastructure

import scala.concurrent.ExecutionContext

import org.scalamock.scalatest.MockFactory
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.geocomply.domain.Crypter
import phoenix.geocomply.domain.Crypter.FailedToDecrypt
import phoenix.geocomply.domain.GeoComplyLocationService.FailedToDecryptGeoPacket
import phoenix.geocomply.domain.GeoComplyLocationService.FailedToParseGeoPacket
import phoenix.geocomply.domain.GeoComplyLocationService.GeoComplyEngineError
import phoenix.geocomply.domain.GeoLocation.AnotherGeolocationInSeconds
import phoenix.geocomply.domain.GeoLocation.ErrorSummaryCause.BlockedService
import phoenix.geocomply.domain.GeoLocation.ErrorSummaryCause.BlockedSoftware
import phoenix.geocomply.domain.GeoLocation.ErrorSummaryCause.OutOfBoundary
import phoenix.geocomply.domain.GeoLocation.ErrorSummaryCause.UnconfirmBoundary
import phoenix.geocomply.domain.GeoLocation.ErrorSummaryCause.UnconfirmUser
import phoenix.geocomply.domain.GeoLocation.GeoLocationPassed
import phoenix.geocomply.domain.GeoLocation.GeoLocationRejected
import phoenix.geocomply.domain.GeoLocation.TroubleshooterMessage
import phoenix.geocomply.support.GeoComplyDataGenerator.generateEncryptedGeoPacket
import phoenix.support.FileSupport
import phoenix.support.FutureSupport

final class DefaultGeoComplyLocationServiceSpec
    extends MockFactory
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with FileSupport {

  implicit val ec: ExecutionContext = scala.concurrent.ExecutionContext.Implicits.global

  "AkkaGeoComplyService" when {
    "evaluateGeoPacket" should {
      "return GeoLocationPassed on GeoComply Success" in withMockedCrypter { (crypterMock, objectUnderTest) =>
        //given
        val givenGeoPacket = generateEncryptedGeoPacket()
        val givenXml = stringFromResource(baseDir = "data/geocomply", fileName = "geo-package-success.xml")
        (crypterMock.decrypt _).when(givenGeoPacket.encryptedString).returns(Right(givenXml))

        //when
        val actual = await(objectUnderTest.evaluateGeoPacket(givenGeoPacket).value)

        //then
        actual should be(Right(GeoLocationPassed(AnotherGeolocationInSeconds(1800))))
      }
      "return GeoLocationRejected on GeoComply Failure" in withMockedCrypter { (crypterMock, objectUnderTest) =>
        //given
        val givenGeoPacket = generateEncryptedGeoPacket()
        val givenXml = stringFromResource(baseDir = "data/geocomply", fileName = "geo-package-failed.xml")
        (crypterMock.decrypt _).when(givenGeoPacket.encryptedString).returns(Right(givenXml))

        //when
        val actual = await(objectUnderTest.evaluateGeoPacket(givenGeoPacket).value)

        //then
        actual should be(
          Right(GeoLocationRejected(
            List(UnconfirmBoundary, OutOfBoundary, BlockedService, BlockedSoftware, UnconfirmUser),
            List(
              TroubleshooterMessage(
                retry = true,
                "More location data is needed to confirm you're in a permitted area. Make sure location services are enabled or your device is in range of multiple wireless connections. Please address the items above, then try again.",
                Some("https://youtu.be/l0iOQmx1qpo"),
                None),
              TroubleshooterMessage(
                retry = false,
                "Your browser doesn't support geolocation. Please try again with a modern browser.",
                None,
                Some("http://domain.com/some-article.html"))))))
      }

      "return GeoComplyEngineError on GeoComply Error" in withMockedCrypter { (crypterMock, objectUnderTest) =>
        //given
        val givenGeoPacket = generateEncryptedGeoPacket()
        val givenXml = stringFromResource(baseDir = "data/geocomply", fileName = "geo-package-error.xml")
        (crypterMock.decrypt _).when(givenGeoPacket.encryptedString).returns(Right(givenXml))

        //when
        val actual = await(objectUnderTest.evaluateGeoPacket(givenGeoPacket).value)

        //then
        actual should be(Left(GeoComplyEngineError))
      }
      "return FailedToParseGeoPacket on invalid XML" in withMockedCrypter { (crypterMock, objectUnderTest) =>
        //given
        val givenGeoPacket = generateEncryptedGeoPacket()
        (crypterMock.decrypt _).when(givenGeoPacket.encryptedString).returns(Right("<invalid>XML</invalid>"))

        //when
        val actual = await(objectUnderTest.evaluateGeoPacket(givenGeoPacket).value)

        //then
        actual should be(Left(FailedToParseGeoPacket))
      }
      "return FailedToDecryptGeoPacket on invalid encrypted GeoPackage" in withMockedCrypter {
        (crypterMock, objectUnderTest) =>
          //given
          val givenGeoPacket = generateEncryptedGeoPacket()
          (crypterMock.decrypt _).when(givenGeoPacket.encryptedString).returns(Left(FailedToDecrypt))

          //when
          val actual = await(objectUnderTest.evaluateGeoPacket(givenGeoPacket).value)

          //then
          actual should be(Left(FailedToDecryptGeoPacket))
      }
    }
  }

  private def withMockedCrypter(testCode: (Crypter, DefaultGeoComplyLocationService) => Unit): Unit = {
    val crypterMock: Crypter = stub[Crypter]
    val objectUnderTest = new DefaultGeoComplyLocationService(crypterMock)

    testCode.apply(crypterMock, objectUnderTest)
  }
}
