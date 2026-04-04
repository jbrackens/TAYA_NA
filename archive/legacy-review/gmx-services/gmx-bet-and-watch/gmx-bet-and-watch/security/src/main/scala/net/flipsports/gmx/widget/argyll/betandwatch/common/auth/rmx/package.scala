package net.flipsports.gmx.widget.argyll.betandwatch.common.auth

import org.cache2k.expiry.ValueWithExpiryTime
import play.api.libs.json.{Format, Json}

package object rmx {

  case class JSONWebKey(kid: String, kty: String, alg: String, use: String, n: String, e: String)

  case class OIDCToken(token: String, expiresAt: Long, cacheOffset: Long) extends ValueWithExpiryTime {
    override def getCacheExpiryTime: Long = {
      (expiresAt - cacheOffset) * 1000
    }
  }


  case class ExchangeTokenUserInfo(email: String,
                                   first_name: String,
                                   display_name: String,
                                   user_sub: String,
                                   external_user_id: String,
                                   company_name: String,
                                   company_id: String,
                                   originator_id: String)

  implicit val exchangeTokenUserInfoConverter: Format[ExchangeTokenUserInfo] = Json.format[ExchangeTokenUserInfo]
}
