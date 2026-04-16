package phoenix.notes

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.Clock
import phoenix.http.routes.backoffice.BackofficeRoutes
import phoenix.jwt.JwtAuthenticator
import phoenix.notes.application.InsertNotes
import phoenix.notes.application.es.Projections
import phoenix.notes.domain.NoteRepository
import phoenix.notes.infrastructure.SlickNoteRepository
import phoenix.notes.infrastructure.http.NoteBackofficeRoutes
import phoenix.projections.ProjectionRunner
import phoenix.punters.domain.PuntersRepository
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletActorProtocol.events.WalletEvent

final case class NoteModule(backofficeRoutes: NoteBackofficeRoutes, noteRepository: NoteRepository)
final case class NoteProjections(projectionsConfig: NotesProjectionsConfig, runner: ProjectionRunner[WalletEvent])

object NoteModule {

  def init(
      system: ActorSystem[_],
      puntersRepository: PuntersRepository,
      walletProjectionRunner: ProjectionRunner[WalletEvent],
      dbConfig: DatabaseConfig[JdbcProfile],
      uuidGenerator: UUIDGenerator,
      clock: Clock)(implicit ec: ExecutionContext, jwtAuthenticator: JwtAuthenticator): NoteModule = {
    val notesConfig = NotesConfig.of(system)
    init(
      puntersRepository,
      NoteProjections(notesConfig.projections, walletProjectionRunner),
      new SlickNoteRepository(dbConfig),
      uuidGenerator,
      clock)
  }

  def init(
      puntersRepository: PuntersRepository,
      noteProjections: NoteProjections,
      noteRepository: NoteRepository,
      uuidGenerator: UUIDGenerator,
      clock: Clock)(implicit ec: ExecutionContext, jwtAuthenticator: JwtAuthenticator): NoteModule = {

    val noteBackofficeRoutes =
      new NoteBackofficeRoutes(
        BackofficeRoutes.adminMountPoint,
        noteRepository,
        puntersRepository,
        uuidGenerator,
        clock)

    val module = NoteModule(noteBackofficeRoutes, noteRepository)
    Projections.start(noteProjections)(new InsertNotes(noteRepository, clock, uuidGenerator))
    module
  }
}
