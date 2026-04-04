package net.flipsports.gmx.widget.argyll.betandwatch.events.module

import java.time.Clock

import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.encrypt.{EncryptionConfig, UserEncryption}
import sttp.client.asynchttpclient.future.AsyncHttpClientFutureBackend
import sttp.client.{NothingT, SttpBackend}

import scala.concurrent.Future

trait BaseModule {

  def config: Config

  //current time
  lazy val timeService = new TimeService(Clock.systemUTC())

  //http calls
  implicit val backend: SttpBackend[Future, Nothing, NothingT] = AsyncHttpClientFutureBackend()

  //encryption
  lazy val userEncryption: UserEncryption = new UserEncryption(EncryptionConfig.load(config))
}
