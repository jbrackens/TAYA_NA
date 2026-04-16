package phoenix.payments.domain

import java.time.OffsetDateTime
import java.util.ResourceBundle

import scala.util.Random

import phoenix.sharding.PhoenixId
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

final case class CashWithdrawalReservation(identifier: CashWithdrawalIdentifier, createdAt: OffsetDateTime)

final case class CashWithdrawalIdentifier(identifier: String) extends PhoenixId {
  override def value: String = identifier

  def asReservation: ReservationId = ReservationId(identifier)

  def asTransaction: TransactionId = TransactionId(identifier)
}

object CashWithdrawalIdentifier {

  val (adjectives, nouns) = {
    val resourceBundle = ResourceBundle.getBundle("payments.cash-withdrawal-identifiers")

    def toListOfStrings(str: String): List[String] =
      str.split(",").toList

    val adjectives: List[String] = toListOfStrings(resourceBundle.getString("adjectives"))
    val nouns: List[String] = toListOfStrings(resourceBundle.getString("nouns"))

    (adjectives, nouns)
  }

  def create(): CashWithdrawalIdentifier =
    CashWithdrawalIdentifier(s"${randomAdjective()}-${randomNoun()}-${randomNoun()}")

  private def randomAdjective(): String =
    randomStringFromList(adjectives)

  private def randomNoun(): String =
    randomStringFromList(nouns)

  private def randomStringFromList(list: List[String]): String =
    list(Random.nextInt(list.size))
}
