package net.flipsports.gmx.widget.argyll.betandwatch.common.auth.rmx

import net.flipsports.gmx.common.internal.scala.cache.LoadingCache2kCache
import org.cache2k.Cache2kBuilder
import org.cache2k.integration.CacheLoader
import scalacache.Cache
import scalacache.modes.scalaFuture._

import scala.concurrent.{ExecutionContext, Future}

class OIDCClient(config: RMXConfig, authenticator: OIDCUserAuthenticator)(implicit var ec: ExecutionContext) {

  private val userToken = "user_token"

  //TODO: no name because of Play hotswap reload
  private val tokenCache2k = new Cache2kBuilder[String, OIDCToken]() {}
    .entryCapacity(1)
    .sharpExpiry(true)
    .loader(new UserTokenLoader())
    .build
  implicit val tokenCache: Cache[OIDCToken] = new LoadingCache2kCache[OIDCToken](tokenCache2k)

  def acquireTechUserToken(): Future[String] = {
    tokenCache.get(userToken).map(_.get.token)
  }

  class UserTokenLoader extends CacheLoader[String, OIDCToken] {
    override def load(key: String): OIDCToken = {
      authenticator.authenticateUser(config.rmxUser, config.rmxUserPass)
    }
  }

}
