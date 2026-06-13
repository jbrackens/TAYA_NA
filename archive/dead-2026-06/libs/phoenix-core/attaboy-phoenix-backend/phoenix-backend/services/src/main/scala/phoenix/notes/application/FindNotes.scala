package phoenix.notes.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.functor._
import cats.syntax.traverse._

import phoenix.core.EitherTUtils._
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.notes.domain.Note
import phoenix.notes.domain.NoteRepository
import phoenix.notes.infrastructure.http.PresentationNote
import phoenix.notes.infrastructure.http.PresentationNote.PresentationManualNote
import phoenix.notes.infrastructure.http.PresentationNote.PresentationSystemNote
import phoenix.notes.infrastructure.http.PunterNotFound
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.PuntersRepository

final class FindNotes(noteRepository: NoteRepository, puntersRepository: PuntersRepository)(implicit
    ec: ExecutionContext) {
  def findNotes(
      punterId: PunterId,
      pagination: Pagination): EitherT[Future, PunterNotFound.type, PaginatedResult[PresentationNote]] =
    for {
      paginatedNotes <- EitherT.liftF(noteRepository.searchAll(punterId, pagination))
      presentationPaginatedNotes <-
        paginatedNotes.data
          .traverse {
            case system: Note.SystemNote =>
              EitherT
                .safeRightT[Future, PunterNotFound.type](PresentationSystemNote.from(system))
                .widen[PresentationNote]
            case manual: Note.ManualNote =>
              puntersRepository
                .findByPunterId(PunterId(manual.authorId.value))
                .toRight(PunterNotFound)
                .map(punter => PresentationManualNote.from(manual, punter.details.name))
                .widen[PresentationNote]
          }
          .map(presentationNotes => paginatedNotes.copy(data = presentationNotes))
    } yield presentationPaginatedNotes
}
