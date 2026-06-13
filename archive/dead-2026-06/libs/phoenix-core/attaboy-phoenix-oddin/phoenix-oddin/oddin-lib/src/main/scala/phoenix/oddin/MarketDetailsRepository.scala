package phoenix.oddin

import akka.actor.ActorSystem
import akka.http.caching.scaladsl.Cache
import phoenix.oddin.data.MarketDescriptions

import scala.concurrent.Future

trait MarketDetailsRepository {

  def marketDescriptions(): Future[MarketDescriptions]
}

object MarketDetailsRepository extends CacheSupport {

  def apply(oddinConfig: OddinConfig, cacheConfig: CacheConfig)(implicit
      system: ActorSystem): MarketDetailsRepository = {
    val cache = createCache[MarketDescriptions](system, cacheConfig)
    val client = OddinRestClient(oddinConfig)

    new CachingMarketDetailsRepositoryImpl(cache, client)
  }
}

class CachingMarketDetailsRepositoryImpl(cache: Cache[String, MarketDescriptions], client: OddinRestClient)
    extends MarketDetailsRepository {
  override def marketDescriptions(): Future[MarketDescriptions] =
    cache.getOrLoad("marketdescriptions", _ => client.listAllMarketDescriptions())
}
