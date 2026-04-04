package net.flipsports.gmx.widget.argyll.betandwatch.events.api.model

import net.flipsports.gmx.common.internal.scala.json.EnumerationConverters
import play.api.libs.json.Format

object StreamingStatusType extends Enumeration {
  type StreamingStatusType = Value

  /** No video available, the event is not started */
  val UPCOMING = Value("Upcoming")

  /** Live video is available */
  val LIVE = Value("Live")

  /** Live video is no longer available, and the archive is not ready */
  val FINISHED = Value("Finished")

  /** Archive video is available */
  val VOD = Value("Vod")

  /** Errors */
  val UNAUTHORISED = Value("Unauthorized")
  val STREAMING_NOT_AVAILABLE = Value("StreamingNotAvailable")
  val INVALID_USER_COUNTRY = Value("InvalidUserCountry")
  val NO_QUALIFYING_BET = Value("NoQualifyingBet")

  implicit val format: Format[StreamingStatusType] = EnumerationConverters.enumFormat(StreamingStatusType)
}