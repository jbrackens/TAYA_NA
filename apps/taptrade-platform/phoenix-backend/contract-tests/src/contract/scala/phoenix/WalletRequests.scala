package phoenix

import scala.concurrent.Future

import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.headers.BasicHttpCredentials
import akka.http.scaladsl.model.headers.OAuth2BearerToken
import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

trait WalletRequests extends HttpSupport with WalletFormat {
  private lazy val phoenixConfig = Config.instance.phoenix

  def creditFunds(punterId: String, amount: BigDecimal, currency: String): Future[HttpResponse] = {
    log.info(s"Credit $amount ($currency) for punter $punterId")

    postNoReturn[CreditFundsRequest](
      s"${phoenixConfig.devApiUrl}/punters/$punterId/funds/credit",
      CreditFundsRequest(amount = DefaultCurrencyMoney(amount, currency), details = "Contract tests credit"),
      Authorization(
        BasicHttpCredentials(phoenixConfig.devApiCredentials.username, phoenixConfig.devApiCredentials.password)))
  }

  def checkBalance(authToken: AuthToken): Future[Balance] = {
    log.info("Checking user wallet balance")

    getCodec[Balance](
      s"${phoenixConfig.publicApiUrl}/punters/wallet/balance",
      Authorization(OAuth2BearerToken(authToken.token)))
  }
}

trait WalletFormat {

  case class DefaultCurrencyMoney(amount: BigDecimal, currency: String) {
    def +(other: DefaultCurrencyMoney): DefaultCurrencyMoney = copy(amount = this.amount + other.amount)
    def -(other: DefaultCurrencyMoney): DefaultCurrencyMoney = copy(amount = this.amount - other.amount)
  }

  case class RealMoney(value: DefaultCurrencyMoney) {
    def +(other: RealMoney): RealMoney = RealMoney(this.value + other.value)
    def +(other: BigDecimal): RealMoney = this + RealMoney(DefaultCurrencyMoney(other, this.value.currency))
    def -(other: RealMoney): RealMoney = RealMoney(this.value - other.value)
    def -(other: BigDecimal): RealMoney = this - RealMoney(DefaultCurrencyMoney(other, this.value.currency))
  }
  case class BonusFunds(value: DefaultCurrencyMoney)

  case class Balance(realMoney: RealMoney, bonusFunds: Seq[BonusFunds] = Seq.empty)

  case class CreditFundsRequest(amount: DefaultCurrencyMoney, details: String)

  implicit val defaultCurrencyMoneyCodec: Codec[DefaultCurrencyMoney] = deriveCodec
  implicit val realMoneyCodec: Codec[RealMoney] = deriveCodec
  implicit val boundsFundsCodec: Codec[BonusFunds] = deriveCodec
  implicit val balanceCodec: Codec[Balance] = deriveCodec
  implicit val creditFundsRequestCodec: Codec[CreditFundsRequest] = deriveCodec
}
