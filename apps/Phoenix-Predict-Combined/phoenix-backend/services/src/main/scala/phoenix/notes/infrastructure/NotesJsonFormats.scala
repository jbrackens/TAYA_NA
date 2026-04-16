package phoenix.notes.infrastructure

import java.util.UUID

import io.circe.Codec
import io.circe.Decoder
import io.circe.HCursor
import io.circe.Json
import io.circe.generic.semiauto.deriveCodec

import phoenix.core.JsonFormats._
import phoenix.notes.domain.NoteId
import phoenix.notes.domain.NoteText
import phoenix.notes.infrastructure.http.AddManualNoteRequestBody
import phoenix.notes.infrastructure.http.PresentationNote
import phoenix.notes.infrastructure.http.PresentationNote.PresentationManualNote
import phoenix.notes.infrastructure.http.PresentationNote.PresentationSystemNote
import phoenix.punters.infrastructure.PunterJsonFormats.personalNameCodec
import phoenix.punters.infrastructure.PunterJsonFormats.punterIdCodec

object NotesJsonFormats {

  implicit val noteIdCodec: Codec[NoteId] = Codec[UUID].bimap(_.value, NoteId.apply)
  implicit val noteTextCodec: Codec[NoteText] = Codec[String].bimapValidated(_.value, NoteText.fromString)

  implicit object PresentationNoteCodec extends Codec[PresentationNote] {

    private val NoteTypeKeyConstant = "noteType"
    private val SystemNoteConstant = "SYSTEM"
    private val ManualNoteConstant = "MANUAL"

    implicit val systemNoteCodec: Codec[PresentationSystemNote] = deriveCodec
    implicit val manualNoteCodec: Codec[PresentationManualNote] = deriveCodec

    override def apply(note: PresentationNote): Json =
      note match {
        case system: PresentationSystemNote =>
          Codec[PresentationSystemNote]
            .apply(system)
            .mapObject(_.add(NoteTypeKeyConstant, Json.fromString(SystemNoteConstant)))
        case manual: PresentationManualNote =>
          Codec[PresentationManualNote]
            .apply(manual)
            .mapObject(_.add(NoteTypeKeyConstant, Json.fromString(ManualNoteConstant)))
      }

    override def apply(c: HCursor): Decoder.Result[PresentationNote] =
      for {
        tpe <- c.downField(NoteTypeKeyConstant).as[String]
        result <- tpe match {
          case SystemNoteConstant => c.as[PresentationSystemNote]
          case ManualNoteConstant => c.as[PresentationManualNote]
          case _                  => c.fail(s"Cannot match type for ${classOf[PresentationNote].getName}")
        }
      } yield result
  }

  implicit val addManualNoteRequestBodyCodec: Codec[AddManualNoteRequestBody] = deriveCodec
}
