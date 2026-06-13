package phoenix.http.infrastructure

import io.circe.Decoder
import io.circe.Json
import org.scalatest.Assertion
import org.scalatest.matchers.should.Matchers

import phoenix.utils.unsafe.EitherOps

object CirceJsonAssertions extends Matchers {
  implicit class JsonOps(self: Json) {
    def shouldNotHaveField(name: String): Assertion = {
      self.hcursor.downField(name).as[Json] should matchPattern {
        case Left(_) =>
      }
    }
    def shouldHaveField(name: String, assertion: Json => Assertion): Assertion = {
      val field = self.hcursor.downField(name).as[Json]
      field should matchPattern {
        case Right(_) =>
      }
      assertion(field.get)
    }
    def shouldHaveElement(index: Int, assertion: Json => Assertion): Assertion = {
      val field = self.hcursor.downN(index).as[Json]
      field should matchPattern {
        case Right(_) =>
      }
      assertion(field.get)
    }
  }

  def jsonFieldOfType[T: Decoder]: Json => Assertion =
    json =>
      json.as[T] should matchPattern {
        case Right(_) =>
      }

  def jsonFieldOfTypeContaining[T: Decoder](value: T): Json => Assertion =
    json =>
      json.as[T] should matchPattern {
        case Right(`value`) =>
      }
}
