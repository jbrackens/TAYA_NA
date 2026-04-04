package net.flipsports.gmx.widget.argyll.betandwatch.events.service.user

import java.util.concurrent.TimeUnit

import net.flipsports.gmx.common.internal.scala.cache.LoadingCache2kCache
import net.flipsports.gmx.common.internal.scala.core.exception.BaseException
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.SBTechService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto.UserDetails
import org.cache2k.Cache2kBuilder
import org.cache2k.integration.CacheLoader
import scalacache.Cache
import scalacache.modes.scalaFuture._

import scala.concurrent.duration.FiniteDuration
import scala.concurrent.{Await, ExecutionContext, Future}

class UsersService(sbtechService: SBTechService)
                  (implicit ec: ExecutionContext) {

  private val userCache2k = new Cache2kBuilder[String, UserDetails]() {}
    .expireAfterWrite(1, TimeUnit.HOURS)
    .resilienceDuration(1, TimeUnit.HOURS)
    .loader(new UserDetailsLoader())
    .build
  implicit val userCache: Cache[UserDetails] = new LoadingCache2kCache[UserDetails](userCache2k)


  def loadUserDetails(userId: String): Future[UserDetails] = {
    userCache.get(userId).map(_.get)
      .recover {
        case e: RuntimeException => throwGenericException(e)
      }
  }

  private def throwGenericException(e: RuntimeException): UserDetails = {
    throw new BaseException(e)
  }

  class UserDetailsLoader extends CacheLoader[String, UserDetails] {
    override def load(userId: String): UserDetails = {
      val eventualDetails = sbtechService.getUserDetails(userId)
      Await.result(eventualDetails, FiniteDuration(30, TimeUnit.SECONDS))
    }
  }

}
