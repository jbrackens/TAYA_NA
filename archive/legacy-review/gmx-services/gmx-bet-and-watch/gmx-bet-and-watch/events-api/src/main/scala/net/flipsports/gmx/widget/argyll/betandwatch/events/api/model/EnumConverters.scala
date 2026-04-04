package net.flipsports.gmx.widget.argyll.betandwatch.events.api.model

import net.flipsports.gmx.common.internal.partner.commons.cons.{SportType, StreamingModelType}
import play.api.libs.json.{Format, JsString, Reads}

trait EnumConverters {

  implicit val SportTypeFormat: Format[SportType] = Format(
    implicitly[Reads[String]].map(SportType.valueOf),
    (e: Enum[_]) => JsString(e.toString)
  )

  implicit val StreamingModelTypeFormat: Format[StreamingModelType] = Format(
    implicitly[Reads[String]].map(StreamingModelType.valueOf),
    (e: Enum[_]) => JsString(e.toString)
  )

}
