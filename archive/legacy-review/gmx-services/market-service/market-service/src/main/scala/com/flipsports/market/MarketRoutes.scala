package com.flipsports.market

import java.util.UUID

import akka.actor.typed.{ActorRef, ActorSystem}
import akka.actor.typed.scaladsl.AskPattern._
import akka.cluster.sharding.typed.ShardingEnvelope
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives
import akka.util.Timeout
import com.flipsports.market.BetCommands._
import com.flipsports.market.BetEvents._
import spray.json.DefaultJsonProtocol._

import scala.concurrent.Future

/**
 * These are the market routes.
 * Akka-http is not yet typed, so we have to do some slight trickery to make it work with akka-typed.
 */
class MarketRoutes(system: ActorSystem[_], betShardRegion: ActorRef[ShardingEnvelope[BetCommand]])
                  (implicit timeout: Timeout) extends Directives {

  implicit val scheduler = system.scheduler
  implicit val betFormat = jsonFormat7(BetDto)
  implicit val betPlacedFormat = jsonFormat8(BetPlaced)

  val marketRoutes =
    path("market") {
      post {
        entity(as[BetDto]) { bet =>
          // Here we do an ask since we are binding the UI to an outcome.
          val id = UUID.randomUUID().toString
          val response: Future[BetPlaced] = betShardRegion.ask(replyTo =>
            ShardingEnvelope("BetCommand", PlaceBet(bet, id, replyTo))) // Need to test this.
          complete(StatusCodes.Created, response)
        }
      }
    }
}
