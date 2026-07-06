package phoenix.core.serialization

import scala.concurrent.duration
import scala.concurrent.duration.FiniteDuration

import io.circe._
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._
import org.scalatest.matchers.should
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.CancellationReason
import phoenix.bets.Stake
import phoenix.core.currency.DefaultCurrency
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.punters.PunterDataGenerator.createDepositLimitAmount
import phoenix.punters.domain.Limit
import phoenix.punters.domain.Limits

class PhoenixCodecsSpec extends AnyWordSpecLike with should.Matchers with PhoenixCodecs {
  "Custom Phoenix codecs" should {
    "serialize and deserialize objects" when {
      def roundTrip[A: Encoder: Decoder](in: A) = {
        decode[A](in.asJson.noSpaces) match {
          case Left(error) => fail(error)
          case Right(res)  => res should equal(in)
        }
      }

      "given DefaultCurrency" in {
        val data = DefaultCurrency
        roundTrip[DefaultCurrency](data)
      }

      "given Stake" in {
        val data = Stake.unsafe(DefaultCurrencyMoney(BigDecimal(100)))
        roundTrip(data)
      }

      "given CancellationReason" in {
        val data = CancellationReason.unsafe("reason")
        roundTrip(data)
      }

      "given TimeUnit" in {
        val data = duration.DAYS
        roundTrip(data)
      }

      "given FiniteDuration" in {
        val data = new FiniteDuration(2, duration.DAYS)
        roundTrip(data)
      }

      "given Limits" in {
        val data = Limits.unsafe(
          Limit.Daily(Some(createDepositLimitAmount(21))),
          Limit.Weekly(Some(createDepositLimitAmount(37))),
          Limit.Monthly(Some(createDepositLimitAmount(2137))))
        roundTrip(data)
      }

    }
  }
}
