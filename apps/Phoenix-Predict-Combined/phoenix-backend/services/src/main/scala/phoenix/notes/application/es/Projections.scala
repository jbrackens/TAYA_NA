package phoenix.notes.application.es

import scala.concurrent.ExecutionContext

import phoenix.notes.NoteProjections
import phoenix.notes.application.InsertNotes

private[notes] object Projections {

  def start(projections: NoteProjections)(insertNotes: InsertNotes)(implicit ec: ExecutionContext): Unit = {
    val projectionsConfig = projections.projectionsConfig
    val walletRunner = projections.runner
    walletRunner.runProjection(
      projectionsConfig.chequeTransactions,
      new ChequeWalletTransactionsEventHandler(insertNotes))
  }
}
