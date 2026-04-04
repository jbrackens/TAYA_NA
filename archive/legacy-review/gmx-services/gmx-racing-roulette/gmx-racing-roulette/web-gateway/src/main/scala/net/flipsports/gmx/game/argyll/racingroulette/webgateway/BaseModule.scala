package net.flipsports.gmx.game.argyll.racingroulette.webgateway

import akka.actor.ActorSystem
import akka.stream.Materializer
import com.typesafe.config.Config
import play.api.Configuration

import scala.concurrent.ExecutionContext

trait BaseModule {
  //concurrent
  implicit def executionContext: ExecutionContext

  //akka
  implicit def actorSystem: ActorSystem

  //stream
  implicit def materializer: Materializer

  //play
  implicit def configuration: Configuration

  //config
  implicit def config: Config
}
