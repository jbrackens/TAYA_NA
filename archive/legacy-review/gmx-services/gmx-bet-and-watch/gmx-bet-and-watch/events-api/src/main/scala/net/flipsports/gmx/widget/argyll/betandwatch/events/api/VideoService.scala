package net.flipsports.gmx.widget.argyll.betandwatch.events.api

import com.lightbend.lagom.scaladsl.api.{Descriptor, Service, ServiceCall}
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception._
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.User.UserEitherError
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.{EventStatus, EventVideo}
import play.api.libs.json.JsValue

trait VideoService extends Service {
  protected val defaultBackendId = "event"

  /**
    * Endpoint to be used as preliminary step to check user permissions, event mapping and video availability.
    * Uses general information (not count/billed by providers).
    *
    * @param eventId The ID of the event to check.
    * @return The item.
    */
  @throws(classOf[EventNotFoundException])
  def checkEventStatus(eventId: Long): ServiceCall[UserEitherError, EventStatus]

  /**
    * Endpoint to be used when user wants to start the video (hits a play button in player).
    * Uses the provider API to generate stream URL - **that operation IS count/billed!**.
    *
    * @param eventId The ID of the event to check.
    * @return The item.
    */
  @throws(classOf[EventNotFoundException])
  @throws(classOf[StreamingNotAvailableException])
  @throws(classOf[UnauthorizedException])
  @throws(classOf[InvalidUserCountryException])
  @throws(classOf[NoQualifyingBetException])
  @throws(classOf[VideoNotAvailableException])
  def getEventVideo(eventId: Long): ServiceCall[UserEitherError, EventVideo]

  /**
    * Equivalent of check-status endpoint for full day streams.
    *
    * @return The item.
    */
  @throws(classOf[EventNotFoundException])
  def checkFullDayStatus(provider: String): ServiceCall[UserEitherError, EventStatus]

  /**
    * Equivalent of get-video endpoint for full day streams.
    *
    * @return The item.
    */
  @throws(classOf[EventNotFoundException])
  @throws(classOf[StreamingNotAvailableException])
  @throws(classOf[UnauthorizedException])
  @throws(classOf[InvalidUserCountryException])
  @throws(classOf[NoQualifyingBetException])
  @throws(classOf[VideoNotAvailableException])
  def getFullDayVideo(provider: String): ServiceCall[UserEitherError, EventVideo]

  /**
    * OPS endpoint to view events/mapping available in backend (for tests).
    *
    * @return The list of all paired events.
    */
  @throws(classOf[UnauthorizedException])
  def displayEvents: ServiceCall[UserEitherError, Seq[String]]

  /**
    * OPS endpoint to view bets/mapping available in backend (for tests).
    *
    * @return The list of user bets.
    */
  @throws(classOf[UnauthorizedException])
  def displayBets: ServiceCall[UserEitherError, JsValue]

  /**
    * Get full day stream.
    */
  @throws(classOf[UnauthorizedException])
  def getOpenStream: ServiceCall[UserEitherError, EventVideo]

  override def descriptor: Descriptor = {
    descriptorFor(defaultBackendId)
  }

  protected def descriptorFor(name: String): Descriptor = {
    import Service._
    import net.flipsports.gmx.common.internal.scala.json.EitherConverters._

    named(name).withCalls(
      pathCall("/api/events/:id/status", checkEventStatus _),
      pathCall("/api/events/:id/video", getEventVideo _),
      pathCall("/api/fullday/:provider/status", checkFullDayStatus _),
      pathCall("/api/fullday/:provider/video", getFullDayVideo _),
      pathCall("/api/events", displayEvents _),
      pathCall("/api/bets", displayBets _),
      pathCall("/api/stream", getOpenStream _),
    ).withAutoAcl(true)
      // Only for generated clients, SHOULD be overridden in implementation with CustomExceptionSerializer(environment)
      .withExceptionSerializer(new CustomExceptionDeserializer)
  }
}
