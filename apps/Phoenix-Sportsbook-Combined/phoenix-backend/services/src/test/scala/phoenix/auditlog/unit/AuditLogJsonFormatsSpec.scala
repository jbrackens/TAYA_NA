package phoenix.auditlog.unit

import java.time.OffsetDateTime

import io.circe.parser.decode
import io.circe.syntax._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.auditlog.domain.AuditLogEntry
import phoenix.auditlog.domain.PredictionMarketLifecycleEntry
import phoenix.auditlog.infrastructure.AuditLogJsonFormats._

final class AuditLogJsonFormatsSpec extends AnyWordSpecLike with Matchers {

  "Audit log JSON formats" should {
    "round-trip prediction market lifecycle entries" in {
      val entry: AuditLogEntry =
        PredictionMarketLifecycleEntry(
          action = "prediction.market.resolved",
          actorId = "admin-001",
          targetId = "pm-btc-120k-2026",
          product = "prediction",
          details = "settlement confirmed",
          occurredAt = OffsetDateTime.parse("2026-03-07T21:15:00Z"),
          dataBefore = Map("status" -> "live"),
          dataAfter = Map("status" -> "resolved", "outcomeId" -> "yes", "outcomeLabel" -> "Yes"),
          createdAt = OffsetDateTime.parse("2026-03-07T21:15:00Z"))

      val decoded = decode[AuditLogEntry](entry.asJson.noSpaces)

      decoded shouldBe Right(entry)
    }
  }
}
