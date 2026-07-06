package phoenix.wallets

import cats.derived.auto.eq._
import org.scalacheck.ScalacheckShapeless._

import phoenix.core.serialization.CommonSerializationImplicits._
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec
import phoenix.wallets.WalletActorProtocol.Responses.WalletResponse
import phoenix.wallets.WalletActorProtocol.commands.WalletCommand
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletState.WalletState

final class WalletsCirceAkkaSerializerSpec extends PhoenixCirceAkkaSerializerSpec {
  roundTripFor[WalletCommand]
  roundTripFor[WalletResponse]
  goldenTestsFor[WalletEvent]
  goldenTestsFor[WalletState]
}
