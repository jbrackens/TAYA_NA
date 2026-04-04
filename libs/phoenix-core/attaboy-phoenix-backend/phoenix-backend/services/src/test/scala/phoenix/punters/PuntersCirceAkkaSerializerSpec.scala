package phoenix.punters

import cats.derived.auto.eq._
import org.scalacheck.ScalacheckShapeless._

import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec
import phoenix.punters.PunterProtocol
import phoenix.punters.PunterState

class PuntersCirceAkkaSerializerSpec extends PhoenixCirceAkkaSerializerSpec {
  roundTripFor[PunterProtocol.Commands.PunterCommand]
  roundTripFor[PunterProtocol.Responses.PunterResponse]
  goldenTestsFor[PunterState.PunterState]
  goldenTestsFor[PunterProtocol.Events.PunterEvent]
}
