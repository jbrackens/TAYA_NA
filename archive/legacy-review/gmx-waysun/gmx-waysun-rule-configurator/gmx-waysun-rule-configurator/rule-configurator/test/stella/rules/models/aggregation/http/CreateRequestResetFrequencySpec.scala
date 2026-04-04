package stella.rules.models.aggregation.http

import java.time.OffsetDateTime
import java.time.ZoneOffset

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

import stella.rules.models.aggregation.IntervalType

class CreateRequestResetFrequencySpec extends AnyFlatSpec with should.Matchers {

  "asOffsetDateTimeTruncated" should "return proper results" in {
    val date = OffsetDateTime.of(2022, 3, 15, 9, 36, 35, 11, ZoneOffset.UTC)
    val expectedDateForMonths = OffsetDateTime.of(2022, 3, 1, 0, 0, 0, 0, ZoneOffset.UTC)
    val expectedDateForDays = OffsetDateTime.of(2022, 3, 15, 0, 0, 0, 0, ZoneOffset.UTC)
    val expectedDateForHours = OffsetDateTime.of(2022, 3, 15, 9, 0, 0, 0, ZoneOffset.UTC)
    val expectedDateForMinutesAndNever = OffsetDateTime.of(2022, 3, 15, 9, 36, 0, 0, ZoneOffset.UTC)

    def verifyTruncatedDate(intervalType: IntervalType, expectedDate: OffsetDateTime) =
      CreateRequestResetFrequency.asOffsetDateTimeTruncated(intervalType, date) shouldBe expectedDate

    verifyTruncatedDate(IntervalType.Months, expectedDateForMonths)
    verifyTruncatedDate(IntervalType.Days, expectedDateForDays)
    verifyTruncatedDate(IntervalType.Hours, expectedDateForHours)
    verifyTruncatedDate(IntervalType.Minutes, expectedDateForMinutesAndNever)
  }
}
