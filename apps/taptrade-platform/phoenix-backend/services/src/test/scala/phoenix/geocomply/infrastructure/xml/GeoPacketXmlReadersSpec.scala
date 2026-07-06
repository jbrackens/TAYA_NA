package phoenix.geocomply.infrastructure.xml

import cats.data.Validated.Valid
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.XmlUtils._
import phoenix.geocomply.domain.GeoLocation.AnotherGeolocationInSeconds
import phoenix.geocomply.domain.GeoLocation.ErrorSummaryCause._
import phoenix.geocomply.domain.GeoLocation.GeoLocationResult
import phoenix.geocomply.domain.GeoLocation.GeoPacket
import phoenix.geocomply.domain.GeoLocation.TroubleshooterMessage
import phoenix.geocomply.infrastructure.xml.GeoPacketXmlReaders._
import phoenix.support.FileSupport

final class GeoPacketXmlReadersSpec extends AnyWordSpecLike with Matchers with FileSupport {

  "GeoPacketXmlReaders" should {

    "read a GeoLocationResult from a success xml string" in {
      val givenXml = stringFromResource(baseDir = "data/geocomply", fileName = "geo-package-success.xml").parseXml

      givenXml.convertTo[GeoPacket] shouldBe Valid(
        GeoPacket(GeoLocationResult.Success, Some(""), List(), Some(AnotherGeolocationInSeconds(1800)), List()))
    }

    "read a GeoLocationResult from a failed xml string" in {
      val givenXml = stringFromResource(baseDir = "data/geocomply", fileName = "geo-package-failed.xml").parseXml

      givenXml.convertTo[GeoPacket] shouldBe Valid(
        GeoPacket(
          GeoLocationResult.Failure,
          Some("boundary"),
          List(UnconfirmBoundary, OutOfBoundary, BlockedService, BlockedSoftware, UnconfirmUser),
          Some(AnotherGeolocationInSeconds(0)),
          List(
            TroubleshooterMessage(
              true,
              "More location data is needed to confirm you're in a permitted area. Make sure location services are enabled or your device is in range of multiple wireless connections. Please address the items above, then try again.",
              Some("https://youtu.be/l0iOQmx1qpo"),
              None),
            TroubleshooterMessage(
              false,
              "Your browser doesn't support geolocation. Please try again with a modern browser.",
              None,
              Some("http://domain.com/some-article.html")))))
    }

    "read a GeoLocationResult from a error xml string" in {
      val givenXml = stringFromResource(baseDir = "data/geocomply", fileName = "geo-package-error.xml").parseXml

      givenXml.convertTo[GeoPacket] shouldBe Valid(
        GeoPacket(GeoLocationResult.Error, Some("Invalid apikey or secretkey"), List(), None, List()))
    }
  }
}
