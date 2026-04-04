package phoenix.notes.support

import phoenix.config.PhoenixProjectionConfig
import phoenix.notes.NoteProjections
import phoenix.notes.NotesProjectionsConfig
import phoenix.support.TestEventQueue
import phoenix.wallets.WalletActorProtocol.events.WalletEvent

final class NoteProjectionsSupport() {
  val eventQueue: TestEventQueue[WalletEvent] = new TestEventQueue[WalletEvent]
  val projections: NoteProjections =
    NoteProjections(
      NotesProjectionsConfig(chequeTransactions = PhoenixProjectionConfig("cheque-transactions")),
      eventQueue)
}
