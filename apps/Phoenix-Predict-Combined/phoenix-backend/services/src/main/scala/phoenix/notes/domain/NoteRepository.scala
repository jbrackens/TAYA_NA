package phoenix.notes.domain

import scala.concurrent.Future

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity.PunterId

trait NoteRepository {
  def insert(note: Note): Future[Unit]
  def searchAll(owner: PunterId, pagination: Pagination): Future[PaginatedResult[Note]]
}
