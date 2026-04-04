package net.flipsports.gmx.widget.argyll.betandwatch.webgateway

import net.flipsports.gmx.common.internal.scala.play.api.{ApiResponse, ResponseOps}
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.DeviceType.DeviceType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.User.UserEitherError
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.{DeviceType, EventStatus, EventVideo, User}
import net.flipsports.gmx.widget.argyll.betandwatch.webgateway.auth.{AuthenticatedAction, AuthenticatedRequest}
import net.flipsports.gmx.widget.argyll.betandwatch.webgateway.events.VideoServiceRouter
import play.api.libs.json.{Format, Json}
import play.api.mvc.{Action, AnyContent, ControllerComponents}

import scala.concurrent.ExecutionContext

class GatewayController(authAction: AuthenticatedAction,
                        videoServiceRouter: VideoServiceRouter,
                        controllerComponents: ControllerComponents)
                       (implicit ec: ExecutionContext)
  extends AbstractBWController(controllerComponents)
    with ResponseOps {

  implicit val eventStatusResponseConverter: Format[ApiResponse[EventStatus]] = Json.format[ApiResponse[EventStatus]]
  implicit val eventVideoResponseConverter: Format[ApiResponse[EventVideo]] = Json.format[ApiResponse[EventVideo]]
  implicit val eventMappingResponseConverter: Format[ApiResponse[Seq[String]]] = Json.format[ApiResponse[Seq[String]]]

  def getEventStatus(eventId: Long): Action[AnyContent] = {
    authAction.async { request =>
      val user = translateUser(request, None)
      val partner = getPartner(user)
      videoServiceRouter.findBackend(partner)
        .checkEventStatus(eventId)
        .invoke(user)
        .map(e => Ok(success(e)))
    }
  }

  def getEventVideo(eventId: Long, device: Option[String]): Action[AnyContent] = {
    authAction.async { request =>
      val user = translateUser(request, device)
      val partner = getPartner(user)
      videoServiceRouter.findBackend(partner)
        .getEventVideo(eventId)
        .invoke(user)
        .map(e => Ok(success(e)))
    }
  }

  def getFullDayStatus(provider: String): Action[AnyContent] = {
    authAction.async { request =>
      val user = translateUser(request, None)
      val partner = getPartner(user)
      videoServiceRouter.findBackend(partner)
        .checkFullDayStatus(provider)
        .invoke(user)
        .map(e => Ok(success(e)))
    }
  }

  def getFullDayVideo(provider: String, device: Option[String]): Action[AnyContent] = {
    authAction.async { request =>
      val user = translateUser(request, device)
      val partner = getPartner(user)
      videoServiceRouter.findBackend(partner)
        .getFullDayVideo(provider)
        .invoke(user)
        .map(e => Ok(success(e)))
    }
  }

  def listEvents(): Action[AnyContent] = {
    authAction.async { request =>
      val user = translateUser(request, None)
      val partner = getPartner(user)
      videoServiceRouter.findBackend(partner)
        .displayEvents
        .invoke(user)
        .map(e => Ok(success(e)))
    }
  }

  def listBets(): Action[AnyContent] = {
    authAction.async { request =>
      val user = translateUser(request, None)
      val partner = getPartner(user)
      videoServiceRouter.findBackend(partner)
        .displayBets
        .invoke(user)
        .map(e => Ok(e))
    }
  }

  @deprecated("Full day stream will not be used after player upgrade - remove then", since = "2020-01-22")
  def openStream(): Action[AnyContent] = {
    authAction.async { request =>
      val user = translateUser(request, None)
      val partner = getPartner(user)
      videoServiceRouter.findBackend(partner)
        .getOpenStream
        .invoke(user)
        .map(e => Ok(success(e)))
    }
  }

  private def translateUser(request: AuthenticatedRequest[AnyContent], device: Option[String]): UserEitherError = {
    request.user.map(user => User(user.externalId, user.partner, translateDevice(device)))
  }

  private def translateDevice(device: Option[String]): DeviceType = {
    device.map(d => DeviceType.values
      .find(t => t.toString.equals(d))
      .getOrElse {
        throwUnsupportedDevice(d)
      }
    ).getOrElse(DeviceType.DESKTOP)
  }

  private def throwUnsupportedDevice(device: String): DeviceType = {
    throw new IllegalArgumentException(s"Unsupported device type $device")
  }

  private def getPartner(user: UserEitherError): Option[String] = {
    user.toOption.map(_.partner)
  }
}
