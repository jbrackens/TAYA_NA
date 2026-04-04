package tech.argyll.gmx.predictorgame.security.auth.rmx

import play.api.libs.functional.syntax._
import play.api.libs.json._
import tech.argyll.gmx.predictorgame.security.auth.UserDetails

object RMXConverters {

  implicit val sbTechUserInfoConverter: Format[UserDetails] = (
    (__ \ "user_sub").format[String] and
      (__ \ "external_user_id").format[String] and
      (__ \ "first_name").format[String] and
      (__ \ "company_id").format[String]
    ) (UserDetails.apply, unlift(UserDetails.unapply))
}
