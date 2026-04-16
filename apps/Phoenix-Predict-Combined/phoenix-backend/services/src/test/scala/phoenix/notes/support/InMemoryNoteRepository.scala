package phoenix.notes.support

import scala.concurrent.Future

import org.scalatest.Assertion
import org.scalatest.matchers.should.Matchers._

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.notes.domain.Note
import phoenix.notes.domain.NoteRepository
import phoenix.punters.PunterEntity

final class InMemoryNoteRepository(var notes: List[Note] = List.empty) extends NoteRepository {
  override def insert(note: Note): Future[Unit] =
    Future.successful {
      notes = notes :+ note
    }

  override def searchAll(owner: PunterEntity.PunterId, pagination: Pagination): Future[PaginatedResult[Note]] =
    Future.successful {
      val filteredNotes = notes.filter(_.owner == owner).sortBy(_.createdAt).reverse
      val requestedPage = filteredNotes.slice(pagination.offset, pagination.offset + pagination.itemsPerPage)

      PaginatedResult(requestedPage, totalCount = filteredNotes.size, pagination)
    }

  def shouldContainNote(predicate: Note => Boolean): Assertion =
    notes.exists(predicate) shouldBe true
}
