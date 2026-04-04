package phoenix.payments.support

import java.util.UUID

import com.github.javafaker.Faker

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.payments.domain.PaymentId
import phoenix.payments.domain.PaymentReference
import phoenix.payments.domain.PaymentSessionStarted
import phoenix.payments.domain.RedirectToPaymentScreenUrl
import phoenix.payments.domain.TransactionId
import phoenix.payments.infrastructure.MerchantId
import phoenix.payments.infrastructure.Password
import phoenix.payments.infrastructure.PaymentsConfig
import phoenix.payments.infrastructure.PxpBaseUrl
import phoenix.payments.infrastructure.ShopId
import phoenix.payments.infrastructure.Username
import phoenix.payments.infrastructure.http.PaymentsTapirEndpoints.PaymentRequest
import phoenix.support.DataGenerator.randomString
import phoenix.support.UnsafeValueObjectExtensions._

object PaymentsDataGenerator {

  private val faker = new Faker()

  def generateRedirectToPaymentScreenUrl(): RedirectToPaymentScreenUrl =
    RedirectToPaymentScreenUrl(faker.internet().url())

  def generatePaymentReference(): PaymentReference =
    PaymentReference(UUID.randomUUID().toString)

  def generateTransactionId(): TransactionId =
    TransactionId(randomString())

  def generatePaymentId(): PaymentId =
    PaymentId(randomString())

  def generateStartedPaymentSession(): PaymentSessionStarted =
    PaymentSessionStarted(generateRedirectToPaymentScreenUrl(), generatePaymentReference())

  def generatePaymentRequest(): PaymentRequest =
    PaymentRequest(PositiveAmount.ensure(DefaultCurrencyMoney(faker.number().numberBetween(1, 1000))).unsafe())

  def generatePaymentsConfig(): PaymentsConfig =
    PaymentsConfig(
      merchantId = MerchantId(randomString()),
      shopId = ShopId(randomString()),
      baseUrl = PxpBaseUrl("localhost:2137"),
      username = Username(randomString()),
      password = Password(randomString()),
      webhookUsername = Username(randomString()),
      webhookPassword = Password(randomString()))
}
