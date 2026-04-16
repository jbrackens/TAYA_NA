package phoenix.notes.infrastructure

import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase
import enumeratum.SlickEnumSupport
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.ExtendedPostgresProfile
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.notes.domain.Note
import phoenix.notes.domain.NoteId
import phoenix.notes.domain.NoteRepository
import phoenix.notes.domain.NoteText
import phoenix.notes.infrastructure.DatabaseNote.ManualDatabaseNoteWithEmptyAuthor
import phoenix.projections.DomainMappers._
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId

final class SlickNoteRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends NoteRepository {
  import dbConfig.db

  private val notes = TableQuery[DatabaseNoteTable]

  override def insert(note: Note): Future[Unit] =
    db.run(notes += DatabaseNote.from(note)).map(_ => ())

  override def searchAll(owner: PunterId, pagination: Pagination): Future[PaginatedResult[Note]] = {
    val notesOfOwner = notes.filter(_.ownerId === owner)
    val databaseQuery = for {
      records <-
        notesOfOwner.sortBy(_.createdAt.desc).drop(pagination.offset).take(pagination.itemsPerPage).result.map { row =>
          row.map(_.toDomainUnsafe()).toList
        }
      totalCount <- notesOfOwner.length.result
    } yield PaginatedResult(records, totalCount, pagination)

    db.run(databaseQuery)
  }
}

private sealed trait NoteType extends EnumEntry with UpperSnakecase
private object NoteType extends Enum[NoteType] {
  def values: IndexedSeq[NoteType] = findValues

  case object Manual extends NoteType
  case object System extends NoteType
}

private final case class DatabaseNote(
    noteId: NoteId,
    owner: PunterId,
    createdAt: OffsetDateTime,
    text: NoteText,
    noteType: NoteType,
    authorId: Option[AdminId]) {
  def toDomainUnsafe(): Note =
    noteType match {
      case NoteType.Manual =>
        Note.ManualNote(
          noteId,
          owner,
          createdAt,
          text,
          authorId.getOrElse(throw ManualDatabaseNoteWithEmptyAuthor(noteId)))
      case NoteType.System => Note.SystemNote(noteId, owner, createdAt, text)
    }
}

private object DatabaseNote {
  def from(note: Note): DatabaseNote =
    note match {
      case system: Note.SystemNote =>
        DatabaseNote(system.noteId, system.owner, system.createdAt, system.text, NoteType.System, authorId = None)
      case manual: Note.ManualNote =>
        DatabaseNote(
          manual.noteId,
          manual.owner,
          manual.createdAt,
          manual.text,
          NoteType.Manual,
          authorId = Some(manual.authorId))
    }

  final case class ManualDatabaseNoteWithEmptyAuthor(noteId: NoteId)
      extends RuntimeException(
        s"Trying to retrieve a manual database note with empty author, which doesn't make sense. NoteId: ${noteId.value}")
}

private final class DatabaseNoteTable(tag: Tag) extends Table[DatabaseNote](tag, "notes") {
  import SlickMappers._

  def noteId: Rep[NoteId] = column[NoteId]("note_id", O.PrimaryKey)
  def ownerId: Rep[PunterId] = column[PunterId]("owner_id", O.PrimaryKey)
  def createdAt: Rep[OffsetDateTime] = column[OffsetDateTime]("created_at")
  def text: Rep[NoteText] = column[NoteText]("text")
  def noteType: Rep[NoteType] = column[NoteType]("note_type")
  def authorId: Rep[Option[AdminId]] = column[Option[AdminId]]("author_id")

  def * : ProvenShape[DatabaseNote] =
    (noteId, ownerId, createdAt, text, noteType, authorId) <> ((DatabaseNote.apply _).tupled, DatabaseNote.unapply)
}

private object SlickMappers extends SlickEnumSupport {
  override val profile = ExtendedPostgresProfile

  implicit val noteTypeMapper: BaseColumnType[NoteType] = mappedColumnTypeForEnum(NoteType)
  implicit val noteIdMapper: BaseColumnType[NoteId] = MappedColumnType.base[NoteId, UUID](_.value, NoteId)
  implicit val noteTextMapper: BaseColumnType[NoteText] =
    MappedColumnType.base[NoteText, String](_.value, NoteText.unsafe)
}
