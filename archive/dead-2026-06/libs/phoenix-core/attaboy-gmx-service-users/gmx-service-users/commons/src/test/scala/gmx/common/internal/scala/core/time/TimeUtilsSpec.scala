package gmx.common.internal.scala.core.time

import java.time.{ LocalDateTime, ZoneOffset, ZonedDateTime }

import org.scalatest.matchers.should.Matchers._
import org.scalatest.prop.TableDrivenPropertyChecks
import org.scalatest.wordspec.AnyWordSpecLike

class TimeUtilsSpec extends AnyWordSpecLike with TableDrivenPropertyChecks {

  "TimeUtils" should {

    "calculate UTC offset" in forAll(timeOffsets) { (givenDate: ZonedDateTime, givenCountryCode: String, expectedOffset: Int) =>
      val actual = TimeUtils.calculateOffset(givenDate, givenCountryCode)

      actual should be(expectedOffset)
    }

  }

  private lazy val timeOffsets = Table(
    ("givenDate", "givenCountryCode", "expectedOffset"),
    (LocalDateTime.of(2020, 8, 17, 17, 42).atZone(ZoneOffset.UTC), "GB", 1),
    (LocalDateTime.of(2020, 12, 17, 17, 42).atZone(ZoneOffset.UTC), "GB", 0),
    (LocalDateTime.of(2020, 8, 17, 17, 42).atZone(ZoneOffset.UTC), "CA", -5),
    (LocalDateTime.of(2020, 8, 17, 17, 42).atZone(ZoneOffset.UTC), "unsupported", 0)
  )
}
