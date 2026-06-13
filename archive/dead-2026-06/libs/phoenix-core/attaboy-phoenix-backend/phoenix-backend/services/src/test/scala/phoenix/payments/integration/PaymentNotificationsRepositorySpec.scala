package phoenix.payments.integration
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.NotificationHandlingError.ProcessingError
import phoenix.payments.domain.CreationType
import phoenix.payments.domain.NotificationAlreadyExists
import phoenix.payments.domain.NotificationIdentifier
import phoenix.payments.domain.NotificationNotFound
import phoenix.payments.domain.NotificationProcessingStatus._
import phoenix.payments.domain.PaymentMethod
import phoenix.payments.domain.PaymentNotificationsRepository
import phoenix.payments.domain.PaymentStateChangedNotification
import phoenix.payments.domain.StateDefinition
import phoenix.payments.infrastructure.InMemoryPaymentNotificationsRepository
import phoenix.payments.infrastructure.SlickPaymentNotificationsRepository
import phoenix.payments.support.PaymentsDataGenerator.generatePaymentId
import phoenix.payments.support.PaymentsDataGenerator.generateTransactionId
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables
import phoenix.support.UnsafeValueObjectExtensions._

final class PaymentNotificationsRepositorySpec
    extends AnyWordSpec
    with Matchers
    with BeforeAndAfterAll
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with TruncatedTables {

  private val inMemoryRepository = () => new InMemoryPaymentNotificationsRepository()
  private val slickRepository = () => {
    truncateTables()
    new SlickPaymentNotificationsRepository(dbConfig)
  }

  "InMemoryPaymentNotificationsRepository" should behave.like(paymentNotificationsRepository(inMemoryRepository))
  "SlickPaymentNotificationsRepository" should behave.like(paymentNotificationsRepository(slickRepository))

  private def paymentNotificationsRepository(emptyRepository: () => PaymentNotificationsRepository): Unit = {
    "should start processing a notification" in {
      // given
      val objectUnderTest = emptyRepository()
      val notification = PaymentStateChangedNotification(
        punterId = generatePunterId(),
        transactionId = generateTransactionId(),
        paymentId = generatePaymentId(),
        amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
        paymentMethod = PaymentMethod.VisaDeposit,
        stateDefinition = StateDefinition.Created,
        creationType = CreationType.User)

      // then
      noException shouldBe thrownBy(awaitRight(objectUnderTest.startProcessing(notification)))

      // and
      val (retrievedNotification, notificationStatus) = awaitRight(objectUnderTest.find(notification.uniqueIdentifier))
      retrievedNotification shouldBe notification
      notificationStatus shouldBe ProcessingInProgress
    }

    "should not allow duplicates" in {
      // given
      val objectUnderTest = emptyRepository()
      val notification = PaymentStateChangedNotification(
        punterId = generatePunterId(),
        transactionId = generateTransactionId(),
        paymentId = generatePaymentId(),
        amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
        paymentMethod = PaymentMethod.VisaDeposit,
        stateDefinition = StateDefinition.Created,
        creationType = CreationType.User)

      // and
      awaitRight(objectUnderTest.startProcessing(notification))

      // when
      val attempt = awaitLeft(objectUnderTest.startProcessing(notification))

      // then
      attempt shouldBe NotificationAlreadyExists(notification.uniqueIdentifier, ProcessingInProgress)
    }

    "should allow updating status of a single notification" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val notUpdatedNotification = PaymentStateChangedNotification(
        punterId = generatePunterId(),
        transactionId = generateTransactionId(),
        paymentId = generatePaymentId(),
        amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
        paymentMethod = PaymentMethod.VisaDeposit,
        stateDefinition = StateDefinition.Created,
        creationType = CreationType.User)
      awaitRight(objectUnderTest.startProcessing(notUpdatedNotification))

      // and
      val notification = PaymentStateChangedNotification(
        punterId = generatePunterId(),
        transactionId = generateTransactionId(),
        paymentId = generatePaymentId(),
        amount = PositiveAmount.ensure(DefaultCurrencyMoney(21.37)).unsafe(),
        paymentMethod = PaymentMethod.VisaDeposit,
        stateDefinition = StateDefinition.Created,
        creationType = CreationType.User)
      awaitRight(objectUnderTest.startProcessing(notification))

      // when
      val processingFailure = ProcessedWithError(ProcessingError("oops, something went wrong!"))
      awaitRight(objectUnderTest.updateProcessingStatus(notification.uniqueIdentifier, processingFailure))

      // then
      val (_, notificationStatus) = awaitRight(objectUnderTest.find(notification.uniqueIdentifier))
      notificationStatus shouldBe processingFailure

      // and
      val (_, otherNotificationStatus) = awaitRight(objectUnderTest.find(notUpdatedNotification.uniqueIdentifier))
      otherNotificationStatus shouldBe ProcessingInProgress
    }

    "should not allow retrieving details of non existing notification" in {
      // given
      val objectUnderTest = emptyRepository()

      // when
      val attempt = awaitLeft(
        objectUnderTest.find(
          NotificationIdentifier(generateTransactionId(), generatePaymentId(), StateDefinition.Created)))

      // then
      attempt shouldBe a[NotificationNotFound]
    }

    "should not allow updating status of non existing notification" in {
      // given
      val objectUnderTest = emptyRepository()

      // when
      val attempt = awaitLeft(
        objectUnderTest.updateProcessingStatus(
          NotificationIdentifier(generateTransactionId(), generatePaymentId(), StateDefinition.Created),
          ProcessedSuccessfully))

      // then
      attempt shouldBe a[NotificationNotFound]
    }
  }
}
