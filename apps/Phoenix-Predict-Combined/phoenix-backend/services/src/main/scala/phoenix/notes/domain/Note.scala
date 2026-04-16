package phoenix.notes.domain

import java.time.OffsetDateTime
import java.util.UUID

import cats.data.Validated

import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.Validation.ValidationOps
import phoenix.core.validation.ValidationException
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue

sealed trait Note {
  def noteId: NoteId
  def owner: PunterId
  def createdAt: OffsetDateTime
  def text: NoteText
}

object Note {
  final case class SystemNote(noteId: NoteId, owner: PunterId, createdAt: OffsetDateTime, text: NoteText) extends Note
  final case class ManualNote(
      noteId: NoteId,
      owner: PunterId,
      createdAt: OffsetDateTime,
      text: NoteText,
      authorId: AdminId)
      extends Note
}

final case class NoteId(value: UUID)

final case class NoteText private (value: String)
object NoteText {
  def fromString(raw: String): Validation[NoteText] =
    Validated.condNel(
      raw.nonEmpty,
      NoteText(raw),
      ValidationException(s"${classOf[NoteText].getName} cannot be empty."))

  def unsafe(raw: String): NoteText = fromString(raw).toTryCombined.get

  def suspendedNote(amlReason: String): NoteText =
    unsafe(s"Suspended: $amlReason")

  def suspendedNote(amlReason: RegistrationIssue): NoteText =
    unsafe(s"Suspended: ${amlReason.details}")

  def activeNote(exitPoint: String): NoteText =
    unsafe(s"Active: $exitPoint")
}
