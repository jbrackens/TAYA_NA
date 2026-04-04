package com.flipsports.market

import akka.{NotUsed, actor}
import akka.actor.typed.{ActorRef, ActorSystem, Behavior, Terminated}
import akka.actor.typed.scaladsl.Behaviors
import akka.actor.typed.scaladsl.adapter._
import akka.cluster.sharding.typed.ShardingEnvelope
import akka.cluster.sharding.typed.scaladsl.{ClusterSharding, Entity, EntityTypeKey}
import akka.http.scaladsl.Http
import akka.util.Timeout

import com.flipsports.market.BetCommands.BetCommand

import scala.concurrent.Future
import scala.concurrent.duration._
import scala.util.{Failure, Success}

object MarketMain extends App {

  final val hostConfig = "market-service.http-host"
  final val portConfig = "market-service.http-port"

  def apply(): Behavior[NotUsed] =
    Behaviors.setup { context =>

      implicit val untypedSystem: actor.ActorSystem = context.system.toClassic
      implicit val timeout = Timeout(10.seconds)
      implicit val ec = context.system.executionContext

      val sharding = ClusterSharding(context.system)
      val BidTypeKey = EntityTypeKey[BetCommand]("BetCommand")
      val bidShardRegion: ActorRef[ShardingEnvelope[BetCommand]] =
        sharding.init(Entity(BidTypeKey)(createBehavior = entityContext => BetEntity(entityContext.entityId)))

      val routes = new MarketRoutes(context.system, bidShardRegion)

      val host = context.system.settings.config.getString(hostConfig)
      val port = context.system.settings.config.getInt(portConfig)

      val serverBinding: Future[Http.ServerBinding] = Http()(untypedSystem).bindAndHandle(routes.marketRoutes
        , host, port)

      serverBinding.onComplete {
        case Success(bound) =>
          println(s"Server online at http://${bound.localAddress.getHostString}:${bound.localAddress.getPort}/")
        case Failure(e) =>
          Console.err.println(s"Server could not start!")
          e.printStackTrace()
          // todo: terminate?
      }

      Behaviors.receiveSignal {
        case (_, Terminated(_)) =>
          Behaviors.stopped
      }
    }

  override def main(args: Array[String]): Unit = {
    ActorSystem(MarketMain(), "market-service")
  }
}
