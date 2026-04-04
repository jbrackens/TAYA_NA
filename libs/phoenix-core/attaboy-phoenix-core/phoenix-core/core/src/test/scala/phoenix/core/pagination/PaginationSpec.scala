package phoenix.core.pagination

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import spray.json.DefaultJsonProtocol._
import spray.json._

class PaginationSpec extends AnyWordSpecLike with Matchers {

  "Pagination" should {
    "serialize PaginatedResult" in {
      val json: JsValue = PaginationSpec.paginatedResults.toJson
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
          |}""".stripMargin

      json.prettyPrint should be(expectedJsonString)
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

  implicit val userDataFormat: RootJsonFormat[TestUserData] = jsonFormat1(TestUserData)

  val paginatedResults: PaginatedResult[TestUserData] =
    PaginatedResult(
      data = Seq(TestUserData("foo"), TestUserData("bar")),
      totalCount = 100,
      currentPage = 1,
      itemsPerPage = 2,
      hasNextPage = true)
}
