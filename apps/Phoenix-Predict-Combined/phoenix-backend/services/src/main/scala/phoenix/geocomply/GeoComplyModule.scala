package phoenix.geocomply

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter.TypedActorSystemOps
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.geocomply.infrastructure.AES128Crypter
import phoenix.geocomply.infrastructure.AkkaHttpGeoComplyLicenseService
import phoenix.geocomply.infrastructure.CachedGeoComplyLicenseService
import phoenix.geocomply.infrastructure.DefaultGeoComplyLocationService
import phoenix.geocomply.infrastructure.http.GeoComplyRoutes
import phoenix.http.core.AkkaHttpClient

final class GeoComplyModule(val geoComplyRoutes: GeoComplyRoutes)

object GeoComplyModule {
  private val log = LoggerFactory.getLogger(getClass)

  def init(clock: Clock)(implicit system: ActorSystem[_], ec: ExecutionContext): GeoComplyModule = {
    log.info("GeoComplyModule starting...")

    val config = GeoComplyConfig.of(system)

    val httpClient = new AkkaHttpClient(system.toClassic)

    val decryptor = new AES128Crypter(config.decryptionInitializationVector, config.decryptionKey)

    val locationService = new DefaultGeoComplyLocationService(decryptor)

    val licenseService = {
      val httpBased = new AkkaHttpGeoComplyLicenseService(httpClient, config)
      new CachedGeoComplyLicenseService(httpBased, clock)
    }

    val routes = new GeoComplyRoutes(locationService, licenseService)

    new GeoComplyModule(routes)
  }
}
