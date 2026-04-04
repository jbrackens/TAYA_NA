package phoenix.core.currency

import io.circe.parser.decode
import io.circe.syntax._
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.currency.CurrencyJsonFormats._
import phoenix.utils.unsafe.EitherOps

class DefaultCurrencyMoneyFormatSpec extends AnyWordSpecLike with Matchers {
  "Money with the default currency" should {

    "convert to JSON" in {
      val dollars = DefaultCurrencyMoney(250.05).asJson.noSpacesSortKeys
      dollars must be("""{"amount":250.05,"currency":"USD"}""")
    }

    "convert from JSON" in {
      val euros = decode[DefaultCurrencyMoney]("""{"amount":123.45,"currency":"USD"}""").get
      euros must be(DefaultCurrencyMoney(123.45))
    }

    "reject a non-default currency" in {
      decode[DefaultCurrencyMoney]("""{"amount":123.45,"currency":"GBP"}""") must matchPattern {
        case Left(_) =>
      }
    }

    "round trip" in {
      val in = DefaultCurrencyMoney(250.05)
      val out = DefaultCurrencyMoney(250.05).asJson.as[DefaultCurrencyMoney]

      out must be(Right(in))
    }
  }
}
