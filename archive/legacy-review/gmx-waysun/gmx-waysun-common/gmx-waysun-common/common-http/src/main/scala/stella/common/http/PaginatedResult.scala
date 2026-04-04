package stella.common.http

final case class PaginatedResult[T](pageNumber: Int, numberOfPages: Option[Int], pageSize: Int, results: Seq[T])
