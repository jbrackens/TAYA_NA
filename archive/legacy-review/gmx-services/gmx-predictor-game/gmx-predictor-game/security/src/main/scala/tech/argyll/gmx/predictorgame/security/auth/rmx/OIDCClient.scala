package tech.argyll.gmx.predictorgame.security.auth.rmx

import org.cache2k.Cache2kBuilder
import org.cache2k.integration.CacheLoader
import scalacache.Cache
import scalacache.modes.scalaFuture._
import tech.argyll.gmx.predictorgame.common.cache.LoadingCache2kCache
import tech.argyll.gmx.predictorgame.security.auth.config.RMXConfig

import scala.concurrent.{ExecutionContext, Future}
import scala.language.higherKinds

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
      authenticator.authenticateUser(config.userName, config.userPassword)
    }
  }

}
