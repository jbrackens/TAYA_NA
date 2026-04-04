package phoenix
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import io.gatling.http.protocol.HttpProtocolBuilder

object CommonHttpProtocol {
  val httpProtocol: HttpProtocolBuilder =
    http
      .acceptHeader("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
      .acceptEncodingHeader("gzip, deflate")
      .acceptLanguageHeader("en-US,en;q=0.5")
      .userAgentHeader("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:16.0) Gecko/20100101 Firefox/16.0")

  val restBaseUrl: String = System.getProperty("gatling.base-url", "http://localhost:13553");
  val devBaseUrl: String = System.getProperty("gatling.dev-base-url", "http://localhost:12553");
  val devUsername: String = System.getProperty("DEV_ROUTES_USERNAME", "dev")
  val devPassword: String = System.getProperty("DEV_ROUTES_PASSWORD", "dev")
}
