package net.flipsports.gmx.common.internal.scala.json

import play.api.libs.json.Json.JsValueWrapper
import play.api.libs.json._

object MapConverters {
  class MapLongReads[T]()(implicit reads: Reads[T]) extends Reads[Map[Long, T]] {
    def reads(jv: JsValue): JsResult[Map[Long, T]] =
      JsSuccess(jv.as[Map[String, T]].map{case (k, v) =>
        k.toString.toLong -> v .asInstanceOf[T]
      })
  }

  class MapLongWrites[T]()(implicit writes: Writes[T])  extends Writes[Map[Long, T]] {
    def writes(map: Map[Long, T]): JsValue =
      Json.obj(map.map{case (s, o) =>
        val ret: (String, JsValueWrapper) = s.toString -> Json.toJson(o)
        ret
      }.toSeq:_*)
  }

  class MapLongFormats[T]()(implicit format: Format[T]) extends Format[Map[Long, T]]{
    override def reads(json: JsValue): JsResult[Map[Long, T]] = new MapLongReads[T].reads(json)
    override def writes(o: Map[Long, T]): JsValue = new MapLongWrites[T].writes(o)
  }

}
