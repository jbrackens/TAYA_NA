package gmx.users.internal.source.sbtech

import SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1.TransactionNotes

import scala.jdk.CollectionConverters._

class TransactionNotesWrapper(lines: Seq[String]) {
  def paymentAccountIdentifier: Option[String] = lines.find(_.startsWith(TransactionNotes.CARD_NUMBER_LINE_PREFIX))
  def paymentDetails: Option[String] =
    lines.find(line => line.startsWith(TransactionNotes.REASON_LINE_PREFIX) || line.startsWith(TransactionNotes.DETAILS_LINE_PREFIX))
  def gatewayCorrelationId: Option[String] = lines.find(_.startsWith(TransactionNotes.CORRELATION_ID_LINE_PREFIX))

}

object TransactionNotesWrapper {
  def build(in: String): TransactionNotesWrapper =
    new TransactionNotesWrapper(TransactionNotes.parseString(in).asScala.toSeq)
}
