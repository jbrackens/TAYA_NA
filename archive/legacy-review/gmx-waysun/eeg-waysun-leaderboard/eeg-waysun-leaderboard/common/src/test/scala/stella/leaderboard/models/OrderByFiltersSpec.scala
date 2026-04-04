package stella.leaderboard.models

import org.scalatest.Assertion
import org.scalatest.Inside
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import sttp.tapir.DecodeResult

import stella.leaderboard.models.OrderByDirection.Asc
import stella.leaderboard.models.OrderByDirection.Desc
import stella.leaderboard.models.OrderByType.Count
import stella.leaderboard.models.OrderByType.FieldValue
import stella.leaderboard.models.OrderByType.Max
import stella.leaderboard.models.OrderByType.Min
import stella.leaderboard.models.OrderByType.Sum

class OrderByFiltersSpec extends AnyFlatSpec with should.Matchers with Inside {
  import OrderByFilters.orderByFiltersCodec

  private val filtersStringRep =
    "desc_min,asc_sum,desc_sum,asc_max,desc_max,desc_count,asc_max,asc_field_value"

  private val filters = OrderByFilters(
    Seq(
      OrderByFilter(Desc, Min),
      OrderByFilter(Desc, Sum),
      OrderByFilter(Desc, Count),
      OrderByFilter(Asc, Max),
      OrderByFilter(Asc, FieldValue)))

  "orderByFiltersCodec" should "decode filters properly" in {
    orderByFiltersCodec.decode(filtersStringRep) shouldBe DecodeResult.Value(filters)
    orderByFiltersCodec.decode(s" $filtersStringRep ") shouldBe DecodeResult.Value(filters)
  }

  it should "fail when filters are not specified" in {
    decodeWithError("")
  }

  it should "fail when filters are incorrect" in {
    decodeWithError(",")
    decodeWithError(",desc_min,asc_sum", "")
    decodeWithError("desc_min,sum_sum", "sum_sum")
    decodeWithError("desc_min,asc_asc", "asc_asc")
    decodeWithError("desc_min,this-should-cause-and-error,asc_max,field_value,min", "this-should-cause-and-error")
  }

  private def decodeWithError(orderBy: String): Assertion =
    decodeWithError(orderBy, orderBy)

  private def decodeWithError(orderBy: String, incorrectPart: String): Assertion =
    inside(orderByFiltersCodec.decode(orderBy)) { case DecodeResult.Error(`orderBy`, e: IllegalArgumentException) =>
      e.getMessage shouldBe s"'$incorrectPart' is not valid OrderBy parameter"
    }
}
