package gmx.service.internal.customer.tools.data

import SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1.TransactionNotes
import pl.szczepanik.silencio.api.Converter
import pl.szczepanik.silencio.core.{ Key, Value }

import scala.jdk.CollectionConverters._

/**
 * Resect all notes (might include PII), retains only those needed for business logic and debugging/tracing
 */
class WalletTransactionNotesResect extends Converter {

  override def convert(
      key: Key,
      value: Value
    ): Value = {
    val lines    = TransactionNotes.parseString(value.getValue.toString).asScala
    val retained = lines.filter(shouldRetain)
    new Value(TransactionNotes.mkString(retained.asJava))
  }

  def shouldRetain(in: String): Boolean =
    in.startsWith(TransactionNotes.CARD_NUMBER_LINE_PREFIX) ||
      in.startsWith(TransactionNotes.REASON_LINE_PREFIX) ||
      in.startsWith(TransactionNotes.DETAILS_LINE_PREFIX) ||
      in.startsWith(TransactionNotes.CORRELATION_ID_LINE_PREFIX)

  override def init(): Unit = {
    // This method is intentionally empty, because this class is stateless
  }
}
