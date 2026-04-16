package phoenix.payments

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.Clock
import phoenix.http.core.AkkaHttpClient
import phoenix.jwt.JwtAuthenticator
import phoenix.payments.application.CreateCashWithdrawal
import phoenix.payments.application.CreateDeposit
import phoenix.payments.application.CreateWithdrawal
import phoenix.payments.application.GetTransactionDetails
import phoenix.payments.application.HandlePXPNotification
import phoenix.payments.application.InitiateChequeWithdrawal
import phoenix.payments.application.VerifyPunterForCashDeposit
import phoenix.payments.domain.CashWithdrawalReservationsRepository
import phoenix.payments.domain.PaymentNotificationsRepository
import phoenix.payments.domain.PaymentsService
import phoenix.payments.domain.TransactionRepository
import phoenix.payments.infrastructure.PaymentsConfig
import phoenix.payments.infrastructure.PxpPaymentsService
import phoenix.payments.infrastructure.SlickCashWithdrawalReservationsRepository
import phoenix.payments.infrastructure.SlickPaymentNotificationsRepository
import phoenix.payments.infrastructure.SlickTransactionRepository
import phoenix.payments.infrastructure.http.PaymentsRoutes
import phoenix.payments.infrastructure.http.PxpRoutes
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletsBoundedContext

final case class PaymentsModule(
    routes: PaymentsModule.Routes,
    commands: PaymentsModule.Commands,
    queries: PaymentsModule.Queries)

object PaymentsModule {
  final case class Routes(pxp: PxpRoutes, payments: PaymentsRoutes)
  final case class Commands(
      createWithdrawal: CreateWithdrawal,
      createCashWithdrawal: CreateCashWithdrawal,
      initiateChequeWithdrawal: InitiateChequeWithdrawal,
      createDeposit: CreateDeposit,
      handlePXPNotification: HandlePXPNotification,
      verifyPunterForCashDeposit: VerifyPunterForCashDeposit)
  final case class Queries(getTransactionDetails: GetTransactionDetails)

  def init(
      dbConfig: DatabaseConfig[JdbcProfile],
      system: ActorSystem[_],
      punters: PuntersBoundedContext,
      wallets: WalletsBoundedContext,
      authenticationRepository: AuthenticationRepository,
      puntersRepository: PuntersRepository,
      auth: JwtAuthenticator,
      uuidGenerator: UUIDGenerator,
      clock: Clock): PaymentsModule = {
    implicit val ec: ExecutionContext = system.executionContext
    val paymentsConfig = PaymentsConfig.of(system)
    val paymentsService = new PxpPaymentsService(new AkkaHttpClient(system.classicSystem), paymentsConfig)(system)
    val transactionRepository = new SlickTransactionRepository(dbConfig)
    val cashWithdrawalReservationsRepository = new SlickCashWithdrawalReservationsRepository(dbConfig)
    val notificationsRepository = new SlickPaymentNotificationsRepository(dbConfig)

    init(punters, wallets, authenticationRepository, puntersRepository, paymentsConfig, auth, uuidGenerator, clock)(
      paymentsService,
      transactionRepository,
      cashWithdrawalReservationsRepository,
      notificationsRepository)
  }

  def init(
      punters: PuntersBoundedContext,
      wallets: WalletsBoundedContext,
      authenticationRepository: AuthenticationRepository,
      puntersRepository: PuntersRepository,
      config: PaymentsConfig,
      auth: JwtAuthenticator,
      uuidGenerator: UUIDGenerator,
      clock: Clock)(
      paymentsService: PaymentsService,
      transactionRepository: TransactionRepository,
      cashWithdrawalReservationsRepository: CashWithdrawalReservationsRepository,
      paymentNotificationsRepository: PaymentNotificationsRepository)(implicit ec: ExecutionContext): PaymentsModule = {
    val commands =
      createCommands(
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        paymentsService,
        transactionRepository,
        cashWithdrawalReservationsRepository,
        paymentNotificationsRepository,
        uuidGenerator,
        clock)
    val queries = createQueries(transactionRepository)
    val routes = createRoutes(config, punters, auth)(commands, queries)

    PaymentsModule(routes, commands, queries)
  }

  private def createCommands(
      punters: PuntersBoundedContext,
      wallets: WalletsBoundedContext,
      authenticationRepository: AuthenticationRepository,
      puntersRepository: PuntersRepository,
      payments: PaymentsService,
      transactions: TransactionRepository,
      cashWithdrawalReservationsRepository: CashWithdrawalReservationsRepository,
      paymentNotificationsRepository: PaymentNotificationsRepository,
      uuidGenerator: UUIDGenerator,
      clock: Clock)(implicit ec: ExecutionContext): PaymentsModule.Commands = {
    val handlePxpNotifications =
      new HandlePXPNotification(
        punters,
        wallets,
        payments,
        transactions,
        cashWithdrawalReservationsRepository,
        paymentNotificationsRepository)
    val createWithdrawal =
      new CreateWithdrawal(
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        payments,
        transactions,
        uuidGenerator)
    val createCashWithdrawal =
      new CreateCashWithdrawal(
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        cashWithdrawalReservationsRepository,
        payments,
        transactions,
        clock)
    val initiateChequeWithdrawal = new InitiateChequeWithdrawal(punters, wallets)
    val createDeposit =
      new CreateDeposit(
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        payments,
        transactions,
        uuidGenerator)
    val verifyPunterForCashDeposit =
      new VerifyPunterForCashDeposit(punters, wallets, puntersRepository, uuidGenerator)

    PaymentsModule.Commands(
      createWithdrawal,
      createCashWithdrawal,
      initiateChequeWithdrawal,
      createDeposit,
      handlePxpNotifications,
      verifyPunterForCashDeposit)
  }

  private def createQueries(transactionRepository: TransactionRepository): PaymentsModule.Queries = {
    val getTransactionDetails = new GetTransactionDetails(transactionRepository)
    PaymentsModule.Queries(getTransactionDetails)
  }

  private def createRoutes(config: PaymentsConfig, punters: PuntersBoundedContext, auth: JwtAuthenticator)(
      commands: PaymentsModule.Commands,
      queries: PaymentsModule.Queries)(implicit ec: ExecutionContext): PaymentsModule.Routes = {
    val pxpRoutes =
      new PxpRoutes(config.webhookCredentials, commands.handlePXPNotification, commands.verifyPunterForCashDeposit)
    val phoenixPaymentsRoutes =
      new PaymentsRoutes(
        punters,
        commands.createWithdrawal,
        commands.createCashWithdrawal,
        commands.initiateChequeWithdrawal,
        commands.createDeposit,
        queries.getTransactionDetails,
        auth)

    PaymentsModule.Routes(pxpRoutes, phoenixPaymentsRoutes)
  }
}
