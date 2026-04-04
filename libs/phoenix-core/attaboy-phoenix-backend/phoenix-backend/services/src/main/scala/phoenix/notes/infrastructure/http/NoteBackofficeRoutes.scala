package phoenix.notes.infrastructure.http

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.syntax.either._
import sttp.model.StatusCode

import phoenix.core.Clock
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.Routes
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator
import phoenix.notes.application.FindNotes
import phoenix.notes.application.InsertNotes
import phoenix.notes.domain.NoteRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.utils.UUIDGenerator

final class NoteBackofficeRoutes(
    basePath: MountPoint,
    noteRepository: NoteRepository,
    puntersRepository: PuntersRepository,
    uuidGenerator: UUIDGenerator,
    clock: Clock)(implicit auth: JwtAuthenticator, ec: ExecutionContext)
    extends Routes {

  private val listNotesRoute = {
    val findNotesUseCase = new FindNotes(noteRepository, puntersRepository)
    NotesBackofficeEndpoints.listNotes(basePath).serverLogic { _ =>
      {
        case (punterId, pagination) =>
          findNotesUseCase
            .findNotes(punterId, pagination)
            .leftMap { _: PunterNotFound.type =>
              ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.PunterProfileDoesNotExist)
            }
            .value
      }
    }
  }

  private val addManualNoteRoute = {
    val insertNotesUseCase = new InsertNotes(noteRepository, clock, uuidGenerator)

    NotesBackofficeEndpoints.addManualNote(basePath).serverLogic { adminId =>
      {
        case (noteOwner, addManualNoteRequestBody) =>
          puntersRepository.findByPunterId(noteOwner).value.flatMap {
            case Some(_) =>
              insertNotesUseCase.insertManualNote(noteOwner, addManualNoteRequestBody.noteText, adminId).map(_.asRight)
            case _ =>
              Future.successful(
                ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist).asLeft)
          }
      }
    }
  }

  override val endpoints: Routes.Endpoints = List(listNotesRoute, addManualNoteRoute)

}

object PunterNotFound
