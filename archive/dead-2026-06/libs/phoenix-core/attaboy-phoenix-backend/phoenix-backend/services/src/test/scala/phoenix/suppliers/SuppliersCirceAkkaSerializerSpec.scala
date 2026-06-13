package phoenix.suppliers

import cats.derived.auto.eq._
import org.scalacheck.ScalacheckShapeless._

import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec
import phoenix.suppliers.oddin.CollectorBehaviors.CollectorMessage
import phoenix.suppliers.oddin.PhoenixOddinStreamConsumer.PhoenixOddinStreamMessage
import phoenix.suppliers.oddin.StronglyTypedOddinStreamConsumer.OddinStreamMessage

class SuppliersCirceAkkaSerializerSpec extends PhoenixCirceAkkaSerializerSpec {
  roundTripFor[CollectorMessage]
  roundTripFor[OddinStreamMessage]
  roundTripFor[PhoenixOddinStreamMessage]
}
