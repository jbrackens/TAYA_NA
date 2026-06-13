package phoenix.oddin

import akka.actor.ActorSystem
import akka.http.caching.scaladsl.Cache
import phoenix.oddin.data.Fixture

import scala.concurrent.Future

trait FixtureDetailsRepository {

  def fixtureDetailsForId(fixtureId: String): Future[Fixture]
}

object FixtureDetailsRepository extends CacheSupport {

  def apply(oddinConfig: OddinConfig, cacheConfig: CacheConfig)(implicit
      system: ActorSystem): FixtureDetailsRepository = {
    val cache = createCache[Fixture](system, cacheConfig)
    val client = OddinRestClient(oddinConfig)

    new CachingFixtureDetailsRepositoryImpl(cache, client)
  }
}

class CachingFixtureDetailsRepositoryImpl(cache: Cache[String, Fixture], client: OddinRestClient)
    extends FixtureDetailsRepository {
  override def fixtureDetailsForId(fixtureId: String): Future[Fixture] =
    cache.getOrLoad(fixtureId, fixtureId => client.listAllFixtureDetailsForSportEvent(fixtureId))
}
