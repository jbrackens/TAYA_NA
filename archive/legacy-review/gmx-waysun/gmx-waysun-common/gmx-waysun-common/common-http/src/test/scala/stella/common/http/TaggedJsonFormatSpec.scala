package stella.common.http

import org.scalatest.matchers.should
import org.scalatest.wordspec.AnyWordSpec
import pl.iterators.kebs.tag.meta.tagged
import pl.iterators.kebs.tagged._
import spray.json.DeserializationException
import spray.json.JsString
import spray.json.JsonFormat

import stella.common.http.instances._

class TaggedJsonFormatSpec extends AnyWordSpec with should.Matchers {

  @tagged object Ids {
    trait IdTag
    type Id = String @@ IdTag
    sealed trait IdError
    case object IdTooShort extends IdError
    case class IdInvalid(message: String) extends IdError
    object Id {
      def validate(s: String): Either[IdError, String] =
        if (s.length < 5) Left(IdTooShort)
        else if (s == "invalid") Left(IdInvalid("Just wrong"))
        else Right(s)
    }
  }

  "Tagged type" should {
    "be properly marshalled into json" in {
      implicitly[JsonFormat[Ids.Id]].write(Ids.Id("012345")) shouldBe JsString("012345")
    }
    "read valid json correctly" in {
      implicitly[JsonFormat[Ids.Id]].read(JsString("012345")) shouldBe Ids.Id("012345")
    }
    "fail to read invalid value" in {
      val e = intercept[DeserializationException] {
        implicitly[JsonFormat[Ids.Id]].read(JsString("0125"))
      }
      e.getMessage shouldBe "IdTooShort"
    }
    "fail to read another invalid value" in {
      val e = intercept[DeserializationException] {
        implicitly[JsonFormat[Ids.Id]].read(JsString("invalid"))
      }
      e.getMessage shouldBe "IdInvalid(Just wrong)"
    }
  }
}
