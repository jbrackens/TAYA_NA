package phoenix.punters.idcomply.application

import phoenix.core.SeqUtils._
import phoenix.notes.domain.NoteText
import phoenix.punters.domain.SocialSecurityNumber.First5DigitsOfSSN
import phoenix.punters.idcomply.domain.Alert
import phoenix.punters.idcomply.domain.AlertKey
import phoenix.punters.idcomply.domain.RequestKYC.KYCMatch
import phoenix.punters.idcomply.domain.RequestKYC.KYCResult
import phoenix.punters.idcomply.domain.TransactionId

sealed trait KYCResultStatus
object KYCResultStatus {
  case class Deceased(note: NoteText) extends KYCResultStatus
  case class Suspend(note: NoteText) extends KYCResultStatus
  case class ForceIDPV(note: NoteText) extends KYCResultStatus
  case class Comply(transactionId: TransactionId, firstFiveDigitsSSN: First5DigitsOfSSN) extends KYCResultStatus

  private val mortalityKey = "list.mortality"
  private val suspendableAlertKeys =
    Seq(mortalityKey, "list.pep", "list.ofac", "ssn.multi.names", "address.is.po", "address.fraud")
  private val forceIdpvAlertKeys = Seq("address.warning")

  def apply(kycResponse: KYCResult, alertsFormatter: Seq[Alert] => String): KYCResultStatus = {
    val suspendableAlerts = kycResponse.alerts.filter(a => suspendableAlertKeys.invariantContains(a.key.value))

    if (suspendableAlerts.nonEmpty) {
      val alertsStr = alertsFormatter(suspendableAlerts)
      if (suspendableAlerts.exists(_.key == AlertKey(mortalityKey)))
        Deceased(NoteText.unsafe(s"User suspended on KYC fail match due to being on a mortality list"))
      else
        Suspend(NoteText.unsafe(
          s"User suspended on KYC fail match due to specific alerts present in KYC response. Specific alerts: $alertsStr"))
    } else {
      val forceIdpvAlerts =
        if (kycResponse.alerts.map(_.key.value).forall(forceIdpvAlertKeys.invariantContains)) kycResponse.alerts
        else List.empty
      if (forceIdpvAlerts.nonEmpty) {
        val alertsStr = alertsFormatter(forceIdpvAlerts)
        ForceIDPV(NoteText.unsafe(
          s"User should continue with IDPV due to specific alerts present in KYC response. Specific alerts: $alertsStr"))
      } else
        kycResponse.kycMatch match {
          case KYCMatch.FailMatch | KYCMatch.PartialMatch =>
            ForceIDPV(NoteText.unsafe(s"User should continue with IDPV due to Fail or Partial match in KYC response."))
          case KYCMatch.FullMatch(firstFiveDigitsSSN) =>
            Comply(kycResponse.transactionId, firstFiveDigitsSSN)
        }
    }
  }
}
