package phoenix.core.pagination

import io.circe._
import io.circe.generic.semiauto._

import phoenix.core.ordering.Direction
import phoenix.core.ordering.Direction.Ascending
import phoenix.core.ordering.Direction.Descending

/**
 * A [[PaginatedResult]] can be used to wrap any types along with
 * the pagination information.
 *
 * @param data         The actual data wrapped in a Seq
 * @param currentPage  Current pagination page
 * @param itemsPerPage Number of items for each page, with the possible exception of potentially incomplete last page
 * @param totalCount   Total number of records available
 * @param hasNextPage  A flag to tell if more data is available in next pages.
 */
case class PaginatedResult[T](
    data: Seq[T],
    currentPage: Int,
    itemsPerPage: Int,
    totalCount: Int,
    hasNextPage: Boolean) {
  def map[S](f: T => S): PaginatedResult[S] = copy(data = data.map(f))

  def flatMap[S](f: T => Seq[S]): PaginatedResult[S] = copy(data = data.flatMap(f))

  def sortBy[U: Ordering](orderingDirection: Direction)(key: T => U): PaginatedResult[T] =
    orderingDirection match {
      case Ascending  => copy(data = data.sortBy(key))
      case Descending => copy(data = data.sortBy(key).reverse)
    }
}

object PaginatedResult {
  implicit def paginationEncoder[T: Encoder]: Encoder[PaginatedResult[T]] = deriveEncoder
  implicit def paginationDecoder[T: Decoder]: Decoder[PaginatedResult[T]] = deriveDecoder

  def apply[T](data: Seq[T], totalCount: Int, paginationRequest: Pagination): PaginatedResult[T] =
    new PaginatedResult[T](
      data = data,
      currentPage = paginationRequest.currentPage,
      itemsPerPage = paginationRequest.itemsPerPage,
      totalCount = totalCount,
      hasNextPage = paginationRequest.hasNextPage(totalCount))
}

/**
 * Every request that is expected to return a PaginatedResult has to provide
 * a `currentPage` and `itemsPerPage`.
 * This class can be used to build a request model for your http endpoints.
 *
 * Usage:
 *
 * {{{
 *   case class MyHttpRequest(someField: String, pagination: Pagination)
 * }}}
 *
 * @param currentPage  The current page number.
 * @param itemsPerPage Total number of records to be included in the result.
 */
case class Pagination(currentPage: Int, itemsPerPage: Int) {
  require(currentPage > 0, "Page number must be > 0")
  require(itemsPerPage > 0, "Per page must be > 0")

  def offset: Int = (currentPage - 1) * itemsPerPage
  def hasNextPage(totalCount: Int): Boolean = totalCount - (offset + itemsPerPage) > 0
}

object Pagination {
  def atFirstPage(itemsPerPage: Int): Pagination = Pagination(currentPage = 1, itemsPerPage = itemsPerPage)
  def one(): Pagination = Pagination(currentPage = 1, itemsPerPage = 1)
}
