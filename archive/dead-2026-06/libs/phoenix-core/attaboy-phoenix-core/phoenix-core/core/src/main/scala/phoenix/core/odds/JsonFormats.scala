package phoenix.core.odds

import spray.json.{ JsNumber, JsValue, JsonFormat }

object JsonFormats {
  implicit val oddsFormat: JsonFormat[Odds] = new JsonFormat[Odds] {
    override def write(odds: Odds): JsValue = JsNumber(odds.value)

    override def read(json: JsValue): Odds = {
      json match {
        case JsNumber(value) => Odds(value)
        case _               => throw new RuntimeException(s"Can't unmarshal $json to ${classOf[Odds].getSimpleName}")
      }
    }
  }
}
