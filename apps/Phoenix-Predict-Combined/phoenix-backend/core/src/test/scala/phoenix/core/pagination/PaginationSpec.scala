package phoenix.core.pagination

import io.circe._
import io.circe.generic.semiauto._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

class PaginationSpec extends AnyWordSpecLike with Matchers {

  "Pagination" should {
    "serialize PaginatedResult" in {
      val json = Encoder[PaginatedResult[PaginationSpec.TestUserData]].apply(PaginationSpec.paginatedResults)
      val expectedJsonString =
        """{
          |  "currentPage": 1,
          |  "data": [{
          |    "name": "foo"
          |  }, {
          |    "name": "bar"
          |  }],
          |  "hasNextPage": true,
          |  "itemsPerPage": 2,
          |  "totalCount": 100
          |}""".stripMargin.replaceAll("[\n ]", "")

      json.noSpacesSortKeys should be(expectedJsonString)
    }

    "Calculate offset and hasNextPage" in {
      val totalRecords = 26
      val pagination = Pagination(currentPage = 2, itemsPerPage = 10)

      pagination.offset should be(10)
      pagination.hasNextPage(totalRecords) should be(true)

      val pagination2 = Pagination(currentPage = 3, itemsPerPage = 10)
      pagination2.offset should be(20)
      pagination2.hasNextPage(totalRecords) should be(false)
    }
  }
}

object PaginationSpec {
  case class TestUserData(name: String)

  implicit val userDataCodec: Codec[TestUserData] = deriveCodec

  val paginatedResults: PaginatedResult[TestUserData] =
    PaginatedResult(
      data = Seq(TestUserData("foo"), TestUserData("bar")),
      totalCount = 100,
      currentPage = 1,
      itemsPerPage = 2,
      hasNextPage = true)
}
