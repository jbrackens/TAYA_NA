package phoenix.punters.unit

import cats.data.Validated
import org.scalatest.Inspectors
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.ValidationException
import phoenix.punters.domain.Limits

final class LimitsSpec extends AnyWordSpecLike with Matchers with Inspectors {
  "Limits" should {
    "preserve daily, weekly & monthly relationship" in {
      // given
      val invalidDepositLimits = List(
        Limits.validateFromRawValues(Value.apply)(daily = Some(30), weekly = Some(20), monthly = Some(10)),
        Limits.validateFromRawValues(Value.apply)(daily = Some(30), weekly = Some(20), monthly = None),
        Limits.validateFromRawValues(Value.apply)(daily = None, weekly = Some(20), monthly = Some(10)),
        Limits.validateFromRawValues(Value.apply)(daily = Some(30), weekly = None, monthly = Some(10)))

      // then
      forAll(invalidDepositLimits) { attempt =>
        attempt.isInvalid shouldBe true
      }
    }

    "accept valid values" in {
      // given
      val validLimits = List(
        Limits.validateFromRawValues(Value.apply)(daily = Some(10), weekly = Some(20), monthly = Some(30)),
        Limits.validateFromRawValues(Value.apply)(daily = Some(10), weekly = None, monthly = None),
        Limits.validateFromRawValues(Value.apply)(daily = None, weekly = Some(20), monthly = None),
        Limits.validateFromRawValues(Value.apply)(daily = None, weekly = None, monthly = Some(30)),
        Limits.validateFromRawValues(Value.apply)(daily = Some(10), weekly = Some(20), monthly = None),
        Limits.validateFromRawValues(Value.apply)(daily = None, weekly = Some(20), Some(30)),
        Limits.validateFromRawValues(Value.apply)(daily = Some(10), weekly = None, Some(30)),
        Limits.validateFromRawValues(Value.apply)(daily = None, weekly = None, monthly = None))

      // then
      forAll(validLimits) { attempt =>
        attempt.isValid shouldBe true
      }
    }
  }
}

private final case class Value private (value: Int)
private object Value {
  implicit val ordering: Ordering[Value] = Ordering.by(_.value)

  def apply(raw: Int): Validation[Value] =
    Validated.condNel(raw > 0, new Value(raw), ValidationException("Value should be higher than zero"))
}
