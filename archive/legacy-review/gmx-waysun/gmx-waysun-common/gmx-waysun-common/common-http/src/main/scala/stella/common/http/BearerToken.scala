package stella.common.http

import stella.common.http.BearerToken.appendScheme

final case class BearerToken private (rawValue: String) {
  lazy val withScheme: String = appendScheme(rawValue)
}

object BearerToken {
  private val scheme = "Bearer"
  private val lowercaseScheme = scheme.toLowerCase

  def apply(headerValue: String): BearerToken = new BearerToken(stripScheme(headerValue))

  private def stripScheme(tokenValue: String): String =
    tokenValue.stripPrefix(scheme).stripPrefix(lowercaseScheme).trim

  private def appendScheme(tokenValue: String): String = s"$scheme $tokenValue"
}
