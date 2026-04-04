package phoenix.notes.application

import scala.concurrent.Future

import phoenix.core.Clock
import phoenix.notes.domain.Note
import phoenix.notes.domain.NoteId
import phoenix.notes.domain.NoteRepository
import phoenix.notes.domain.NoteText
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.utils.UUIDGenerator

final class InsertNotes(noteRepository: NoteRepository, clock: Clock, uuidGenerator: UUIDGenerator) {
  def insertSystemNote(punterId: PunterId, text: NoteText): Future[Unit] = {
    val note = Note.SystemNote(
      noteId = NoteId(uuidGenerator.generate()),
      owner = punterId,
      createdAt = clock.currentOffsetDateTime(),
      text = text)
    noteRepository.insert(note)
  }

  def insertManualNote(punterId: PunterId, text: NoteText, author: AdminId): Future[Unit] = {
    val note = Note.ManualNote(
      noteId = NoteId(uuidGenerator.generate()),
      owner = punterId,
      createdAt = clock.currentOffsetDateTime(),
      text = text,
      authorId = author)
    noteRepository.insert(note)
  }
}
