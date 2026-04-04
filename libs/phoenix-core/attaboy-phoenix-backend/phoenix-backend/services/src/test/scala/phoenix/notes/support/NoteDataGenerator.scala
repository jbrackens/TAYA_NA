package phoenix.notes.support

import phoenix.notes.domain.Note
import phoenix.notes.domain.Note.ManualNote
import phoenix.notes.domain.Note.SystemNote
import phoenix.notes.domain.NoteId
import phoenix.notes.domain.NoteText
import phoenix.punters.PunterDataGenerator.Api.generateAdminId
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.support.DataGenerator
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DataGenerator.randomString
import phoenix.support.DataGenerator.randomUUID

object NoteDataGenerator {

  def generateNote(): Note =
    DataGenerator.randomElement(List(generateSystemNote(), generateManualNote()))

  def generateSystemNote(): SystemNote =
    SystemNote(generateNoteId(), generatePunterId(), randomOffsetDateTime(), randomNoteText())

  def generateManualNote(): ManualNote =
    ManualNote(generateNoteId(), generatePunterId(), randomOffsetDateTime(), randomNoteText(), generateAdminId())

  def generateNoteId(): NoteId = NoteId(randomUUID())

  def randomNoteText(): NoteText = NoteText.unsafe(randomString())
}
