package net.flipsports.gmx.widget.argyll.betandwatch.events

import java.time.Duration

import com.lightbend.lagom.scaladsl.api.{Descriptor, ServiceCall}
import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.json.MapConverters.MapLongFormats
import net.flipsports.gmx.widget.argyll.betandwatch.events.api._
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception.CustomExceptionSerializer
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.User.UserEitherError
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.{EventStatus, EventVideo}
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.{EventMapping, EventMappingDisplay, ProviderEvent, VideoStreamRequest}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.BusinessRules
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.bet.BetsService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.EventsService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto.InBetSelection
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.user.UsersService
import play.api.Environment
import play.api.libs.json.{Format, JsValue, Json}

import scala.concurrent.{ExecutionContext, Future}

class VideoServiceImpl(eventsService: EventsService,
                       usersService: UsersService,
                       betsService: BetsService)
                      (config: Config)
                      (implicit val environment: Environment, ec: ExecutionContext)
  extends VideoService
    with Helpers
    with BusinessRules
    with EventMappingDisplay {

  implicit val eventBetsResponseConverter: Format[Map[Long, Seq[String]]] = new MapLongFormats[Seq[String]]
  implicit val userEventBetsResponseConverter: Format[Map[Long, Map[Long, Seq[String]]]] = new MapLongFormats[Map[Long, Seq[String]]]

  override def getConfig: Config = config

  override def descriptor: Descriptor = super.descriptor
    .withExceptionSerializer(new CustomExceptionSerializer(environment))


  override def checkEventStatus(eventId: Long): ServiceCall[UserEitherError, EventStatus] = ServiceCall { userRequest =>
    eventsService.getEventBySBTechId(eventId)
      .flatMap(foundEvent => checkStatus(userRequest, foundEvent))
  }

  private def checkStatus(userRequest: UserEitherError, mapping: EventMapping): Future[EventStatus] = {
    (for {
      streamEvent <- Future {
        stream(mapping)
      }
      user = authorized(userRequest)
      _ <- validateEvent(mapping.event.id, user.externalId, streamEvent)
    } yield EventStatus(streamEvent.streamingStatus, mapping.provider, mapping.streamingModel, mapping.event.countryCode, mapping.event.sportType))
      .recover(handleError(mapping))
  }


  override def getEventVideo(eventId: Long): ServiceCall[UserEitherError, EventVideo] = ServiceCall { userRequest =>
    eventsService.getEventBySBTechId(eventId)
      .flatMap(foundEvent => getVideo(userRequest, foundEvent))
  }

  private def getVideo(userRequest: UserEitherError, mapping: EventMapping): Future[EventVideo] = {
    for {
      streamEvent <- Future {
        stream(mapping)
      }
      user = authorized(userRequest)
      _ <- validateEvent(mapping.event.id, user.externalId, streamEvent)
      video <- eventsService.getVideoStream(mapping.event.id, streamEvent.provider,
        VideoStreamRequest(streamEvent.id, user.externalId, user.partner, user.device))
    } yield EventVideo(video.url, mapping.provider, video.method, mapping.streamingModel, mapping.event.countryCode, mapping.event.sportType)
  }

  private def validateEvent(eventId: Long, userId: String, event: ProviderEvent): Future[ProviderEvent] = {
    for {
      userDetails <- usersService.loadUserDetails(userId)
      _ = verifyCountry(userDetails, event)
      bets <- betsService.loadUserBetsForEvent(userDetails, eventId)
      _ = verifyBets(userDetails, event, bets)
    } yield event
  }

  override def checkFullDayStatus(provider: String): ServiceCall[UserEitherError, EventStatus] = ServiceCall { userRequest =>
    eventsService.getFullDayStream(provider)
      .flatMap(foundEvent => checkStatus(userRequest, foundEvent))
  }

  override def getFullDayVideo(provider: String): ServiceCall[UserEitherError, EventVideo] = ServiceCall { userRequest =>
    eventsService.getFullDayStream(provider)
      .flatMap(foundEvent => getVideo(userRequest, foundEvent))
  }

  override def displayEvents: ServiceCall[UserEitherError, Seq[String]] = ServiceCall { userRequest =>
    authorized(userRequest)
    eventsService.getMapping
      .map(_.map(displayMappings))
  }

  override def displayBets: ServiceCall[UserEitherError, JsValue] = ServiceCall { userRequest =>
    authorized(userRequest)
    betsService.getMapping
      .map(displayBetMapping)
  }

  def displayBetMapping(mapping: Map[Long, Map[Long, Seq[InBetSelection]]]): JsValue = {
    val result = mapping.mapValues(_.mapValues(_.map(display)))

    Json.toJson(result)
  }

  private def display(bet: InBetSelection): String = s"user=${bet.bet.customerId} -> event=${bet.selection.gameId} -> " +
    s"Bet(stake=${bet.bet.stake}, type=${bet.selection.typeName}, purchaseID=${bet.bet.purchaseID}) " +
    s"created ${bet.bet.creationDate} loaded after ${Duration.between(bet.bet.creationDate, bet.loadedAt)}"

  @deprecated("Full day stream will not be used after player upgrade - remove then", since = "2020-01-22")
  override def getOpenStream: ServiceCall[UserEitherError, EventVideo] = getFullDayVideo("sis")
}
