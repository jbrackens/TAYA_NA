package phoenix
import io.circe.Codec
import io.circe.syntax._
import io.gatling.core.Predef._
import io.gatling.core.session.Expression
import io.gatling.core.session._
import io.gatling.http.request.builder.HttpRequestBuilder

object JsonOps {
  implicit class ExpressionOps(builder: HttpRequestBuilder) {
    def asJsonBody[T: Codec](expression: Expression[T]): HttpRequestBuilder =
      builder.asJson.body(StringBody(expression.map[String](_.asJson.toString)))
  }
}
