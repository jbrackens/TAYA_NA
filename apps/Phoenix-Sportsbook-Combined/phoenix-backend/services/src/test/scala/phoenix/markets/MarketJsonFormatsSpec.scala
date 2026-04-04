package phoenix.markets

import io.circe.parser.decode
import io.circe.syntax._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.markets.LifecycleChangeReason.BackofficeCancellation
import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.LifecycleChangeReason.DataSupplierCancellation
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketLifecycle.Cancelled
import phoenix.markets.MarketLifecycle.NotBettable
import phoenix.markets.MarketLifecycle.Resettled
import phoenix.markets.MarketLifecycle.Settled
import phoenix.markets.infrastructure.MarketJsonFormats._
import phoenix.utils.unsafe.EitherOps

final class MarketJsonFormatsSpec extends AnyWordSpecLike with Matchers {
  "Market lifecycle format should" should {
    "properly serialize/deserialize 'Bettable'" in {
      def lifecycleJson = """{"changeReason":{"type":"DATA_SUPPLIER_CHANGE"},"type":"BETTABLE"}"""

      val deserialized = decode[MarketLifecycle](lifecycleJson).get
      deserialized shouldBe Bettable(DataSupplierStatusChange)

      val serialized = deserialized.asJson.noSpacesSortKeys
      serialized shouldBe lifecycleJson
    }

    "properly serialize/deserialize 'NotBettable'" in {
      def lifecycleJson =
        """{"changeReason":{"reason":"Potential fraud","type":"BACKOFFICE_CHANGE"},"type":"NOT_BETTABLE"}"""

      val deserialized = decode[MarketLifecycle](lifecycleJson).get
      deserialized shouldBe NotBettable(BackofficeChange("Potential fraud"))

      val serialized = deserialized.asJson.noSpacesSortKeys
      serialized shouldBe lifecycleJson
    }

    "properly serialize/deserialize 'Settled'" in {
      def lifecycleJson =
        """{"changeReason":{"type":"DATA_SUPPLIER_CHANGE"},"type":"SETTLED","winningSelection":"selection123"}"""

      val deserialized = decode[MarketLifecycle](lifecycleJson).get
      deserialized shouldBe Settled(DataSupplierStatusChange, "selection123")

      val serialized = deserialized.asJson.noSpacesSortKeys
      serialized shouldBe lifecycleJson
    }

    "properly serialize/deserialize 'Resettled'" in {
      def lifecycleJson =
        """{"changeReason":{"type":"DATA_SUPPLIER_CHANGE"},"newWinningSelection":"selection123","type":"RESETTLED"}"""

      val deserialized = decode[MarketLifecycle](lifecycleJson).get
      deserialized shouldBe Resettled(DataSupplierStatusChange, "selection123")

      val serialized = deserialized.asJson.noSpacesSortKeys
      serialized shouldBe lifecycleJson
    }

    "properly serialize/deserialize dataSource 'Cancelled'" in {
      def lifecycleJson =
        """{"changeReason":{"reason":"deactivated","type":"DATA_SUPPLIER_CANCELLATION"},"type":"CANCELLED"}"""

      val deserialized = decode[MarketLifecycle](lifecycleJson).get
      deserialized shouldBe Cancelled(DataSupplierCancellation("deactivated"))

      val serialized = deserialized.asJson.noSpacesSortKeys
      serialized shouldBe lifecycleJson
    }

    "properly serialize/deserialize Backoffice 'Cancelled'" in {
      def lifecycleJson =
        """{"changeReason":{"reason":"deactivated","type":"BACKOFFICE_CANCELLATION"},"type":"CANCELLED"}"""

      val deserialized = decode[MarketLifecycle](lifecycleJson).get
      deserialized shouldBe Cancelled(BackofficeCancellation("deactivated"))

      val serialized = deserialized.asJson.noSpacesSortKeys
      serialized shouldBe lifecycleJson
    }
  }
}
