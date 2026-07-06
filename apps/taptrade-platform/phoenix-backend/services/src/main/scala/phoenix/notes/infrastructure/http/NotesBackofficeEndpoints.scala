package phoenix.notes.infrastructure.http

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext

import io.scalaland.chimney.dsl._
import sttp.model.StatusCode
import sttp.tapir.EndpointInput.PathCapture
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._

import phoenix.core.pagination.PaginatedResult
import phoenix.http.core.TapirAuthDirectives.adminEndpoint
import phoenix.http.routes.EndpointInputs
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator
import phoenix.notes.domain.Note.ManualNote
import phoenix.notes.domain.Note.SystemNote
import phoenix.notes.domain.NoteId
import phoenix.notes.domain.NoteText
import phoenix.notes.infrastructure.NotesJsonFormats._
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.PersonalName
import phoenix.punters.infrastructure.http.PunterTapirCodecs.punterIdCodec

object NotesBackofficeEndpoints extends TapirCodecEnumeratum {

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.punters.infrastructure.http.PunterTapirSchemas._
  import phoenix.notes.infrastructure.http.NotesTapirSchemas._

  def listNotes(basePath: MountPoint)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    adminEndpoint.get
      .in(basePath / "punters" / punterId / "notes")
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[PresentationNote]])
      .out(statusCode(StatusCode.Ok))

  def addManualNote(basePath: MountPoint)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    adminEndpoint.post
      .in(basePath / "punters" / punterId / "notes")
      .in(jsonBody[AddManualNoteRequestBody])
      .out(statusCode(StatusCode.NoContent))

  private lazy val punterId: PathCapture[PunterId] = path[PunterId]("punterId")
}

sealed trait PresentationNote extends Product with Serializable
object PresentationNote {
  final case class PresentationSystemNote(noteId: NoteId, owner: PunterId, createdAt: OffsetDateTime, text: NoteText)
      extends PresentationNote
  object PresentationSystemNote {
    def from(systemNote: SystemNote): PresentationSystemNote = systemNote.into[PresentationSystemNote].transform
  }

  final case class PresentationManualNote(
      noteId: NoteId,
      owner: PunterId,
      createdAt: OffsetDateTime,
      text: NoteText,
      authorId: PunterId,
      authorName: PersonalName)
      extends PresentationNote
  object PresentationManualNote {
    def from(manualNote: ManualNote, authorName: PersonalName): PresentationManualNote =
      manualNote.into[PresentationManualNote].withFieldComputed(_.authorName, _ => authorName).transform
  }
}

final case class AddManualNoteRequestBody(noteText: NoteText)
