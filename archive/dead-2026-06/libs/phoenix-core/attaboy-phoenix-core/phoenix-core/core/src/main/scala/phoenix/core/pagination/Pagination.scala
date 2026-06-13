package phoenix.core.pagination

import spray.json.DefaultJsonProtocol._
import spray.json.{ JsonFormat, RootJsonFormat }

/**
 * A [[PaginatedResult]] can be used to wrap any types along with
 * the pagination information.
 *
 * @param data        The actual data wrapped in a Seq
 * @param currentPage Current pagination page
 * @param itemsPerPage Number of items for each page, with the possible exception of potentially incomplete last page
 * @param totalCount  Total number of records available
 * @param hasNextPage A flag to tell if more data is available in next pages.
 */
case class PaginatedResult[T](
    data: Seq[T],
    currentPage: Int,
    itemsPerPage: Int,
    totalCount: Int,
    hasNextPage: Boolean) {
  def map[S](f: T => S): PaginatedResult[S] = copy(data = data.map(f))
}

object PaginatedResult {
  implicit def paginationFormat[T: JsonFormat]: RootJsonFormat[PaginatedResult[T]] =
    jsonFormat5(PaginatedResult.create[T])

  private def create[T](data: Seq[T], currentPage: Int, itemsPerPage: Int, totalCount: Int, hasNextPage: Boolean) =
    new PaginatedResult[T](data, currentPage, itemsPerPage, totalCount, hasNextPage)

  def apply[T](data: Seq[T], totalCount: Int, paginationRequest: Pagination): PaginatedResult[T] =
    new PaginatedResult[T](
      data = data,
      totalCount = totalCount,
      currentPage = paginationRequest.currentPage,
      itemsPerPage = paginationRequest.itemsPerPage,
      hasNextPage = paginationRequest.hasNextPage(totalCount))
}

/**
 * Every request that is expected to return a PaginatedResult has to provide
 * a `pageNumber` and `perPage`
 * This class can be used to build a request model for your http endpoints.
 *
 * Usage:
 *
 * {{{
 *   case class MyHttpRequest(someField: String, pagination: Pagination)
 * }}}
 *
 * @param currentPage The current page number.
 * @param itemsPerPage    Total number of records to be included in the result.
 */
case class Pagination(currentPage: Int, itemsPerPage: Int) {
  require(currentPage > 0, "Page number must be > 0")
  require(itemsPerPage > 0, "Per page must be > 0")

  def offset: Int = (currentPage - 1) * itemsPerPage
  def hasNextPage(totalCount: Int): Boolean = totalCount - (offset + itemsPerPage) > 0
}

object Pagination {
  implicit val paginationFormat: RootJsonFormat[Pagination] = jsonFormat2(Pagination.apply)
}
