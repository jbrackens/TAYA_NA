package net.flipsports.gmx.widget.argyll.betandwatch.events.api.model

import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.DeviceType.DeviceType
import play.api.libs.json.{Format, Json}

case class User(externalId: String, partner: String, device: DeviceType)

object User {

  type UserEitherError = Either[String, User]

  implicit val format: Format[User] = Json.format
}
