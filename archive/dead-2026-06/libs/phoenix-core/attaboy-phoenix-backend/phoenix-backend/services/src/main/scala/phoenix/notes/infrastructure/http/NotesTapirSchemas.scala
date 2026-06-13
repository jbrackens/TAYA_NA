package phoenix.notes.infrastructure.http

import sttp.tapir.Schema

import phoenix.notes.domain.NoteId
import phoenix.notes.domain.NoteText

object NotesTapirSchemas {
  implicit val noteIdSchema: Schema[NoteId] = Schema.string
  implicit val noteTextSchema: Schema[NoteText] = Schema.string
}
