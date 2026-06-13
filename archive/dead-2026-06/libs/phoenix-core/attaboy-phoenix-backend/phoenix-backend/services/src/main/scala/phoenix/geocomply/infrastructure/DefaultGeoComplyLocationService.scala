package phoenix.geocomply.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.either._
import org.slf4j.LoggerFactory

import phoenix.core.XmlUtils._
import phoenix.geocomply.domain.Decryption._
import phoenix.geocomply.domain.GeoComplyLocationService._
import phoenix.geocomply.domain.GeoLocation.GeoLocationResponse
import phoenix.geocomply.domain.GeoLocation._
import phoenix.geocomply.domain._
import phoenix.geocomply.infrastructure.xml.GeoPacketXmlReaders._

private[geocomply] final class DefaultGeoComplyLocationService(decryptor: Crypter)(implicit ec: ExecutionContext)
    extends GeoComplyLocationService {

  private val log = LoggerFactory.getLogger(getClass)

  override def evaluateGeoPacket(
      encryptedGeoPacket: EncryptedGeoPacket): EitherT[Future, GeoLocationError, GeoLocationResponse] = {
    val result = for {
      decrypted <- decryptGeoPackage(encryptedGeoPacket)
      parsed <- parseGeoPacket(decrypted)
    } yield parsed

    EitherT.fromEither(result)
  }

  private def decryptGeoPackage(
      encryptedGeoPacket: EncryptedGeoPacket): Either[FailedToDecryptGeoPacket.type, String] = {
    log.debug("Decoding package: {}", encryptedGeoPacket.encryptedString)
    decryptor.decrypt(encryptedGeoPacket.encryptedString).leftMap(_ => FailedToDecryptGeoPacket)
  }

  private def parseGeoPacket(decryptedMessage: String): Either[GeoLocationError, GeoLocationResponse] = {
    log.debug("Parsing package: {}", decryptedMessage)
    val parsed = decryptedMessage.parseXml.convertTo[GeoPacket].toEither
    parsed match {
      case Right(geoPacket @ GeoPacket(GeoLocationResult.Success, _, _, _, _)) =>
        GeoLocationPassed(geoPacket.anotherGeolocationInSeconds.get).asRight
      case Right(geoPacket @ GeoPacket(GeoLocationResult.Failure, _, _, _, _)) =>
        GeoLocationRejected(geoPacket.errorSummary, geoPacket.messages).asRight
      case Right(GeoPacket(GeoLocationResult.Error, _, _, _, _)) => GeoComplyEngineError.asLeft
      case Left(_)                                               => FailedToParseGeoPacket.asLeft
    }
  }
}
