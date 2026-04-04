package gmx.users.internal.logic

import gmx.users.internal.aggregate._
import play.api.libs.json._

object ResponsesJsonConverters {

  implicit val formatConfirmation: Format[Confirmation] = new Format[Confirmation] {
    override def reads(json: JsValue): JsResult[Confirmation] =
      if ((json \ "reason").isDefined)
        Json.fromJson[Rejected](json)
      else
        Json.fromJson[Accepted](json)

    override def writes(o: Confirmation): JsValue =
      o match {
        case acc: Accepted => Json.toJson(acc)
        case rej: Rejected => Json.toJson(rej)
      }
  }

  implicit val formatAccepted: Format[Accepted] =
    Format(Reads(_ => JsSuccess(Accepted)), Writes(_ => Json.obj()))

  implicit val formatRejected: Format[Rejected] = Json.format

}
