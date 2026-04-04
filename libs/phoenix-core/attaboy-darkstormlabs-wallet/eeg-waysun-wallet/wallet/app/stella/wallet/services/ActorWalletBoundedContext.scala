package stella.wallet.services

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success

import akka.actor.typed.ActorRef
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.EntityRef
import akka.util.Timeout
import cats.data.EitherT

import stella.common.models.Ids._

import stella.wallet.config.WalletServerConfig
import stella.wallet.db.currency.CurrencyRepository
import stella.wallet.db.transaction.TransactionReadRepository
import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.Ids.WalletKey
import stella.wallet.models.currency._
import stella.wallet.models.transaction.Transaction
import stella.wallet.models.transaction.TransactionType
import stella.wallet.models.wallet._
import stella.wallet.services.WalletActorProtocol._
import stella.wallet.services.WalletBoundedContext.Errors._
import stella.wallet.services.projections.WalletTransactionProjectionHandler

class ActorWalletBoundedContext(
    sharding: ClusterSharding,
    config: WalletServerConfig,
    currencyRepository: CurrencyRepository,
    transactionRepository: TransactionReadRepository,
    walletShardingRegion: WalletShardingRegion,
    walletTransactionProjectionHandler: WalletTransactionProjectionHandler)
    extends WalletBoundedContext {
  walletShardingRegion.initSharding()
  walletTransactionProjectionHandler.startShardedDaemonProcess()

  private implicit val askTimeout: Timeout = Timeout(config.walletAkka.walletEntityAskTimeout)

  override def getCurrenciesAssociatedWithProject(projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Seq[Currency]] =
    for {
      currencyEntities <- currencyRepository.getCurrenciesAssociatedWithProject(projectId)
    } yield currencyEntities.map(_.toCurrency)

  override def getAllCurrencies()(implicit ec: ExecutionContext): Future[Seq[Currency]] =
    for {
      currencyEntities <- currencyRepository.getAllCurrencies()
    } yield currencyEntities.map(_.toCurrency)

  override def getCurrency(currencyId: CurrencyId)(implicit
      ec: ExecutionContext): EitherT[Future, GetCurrencyError, Currency] =
    for {
      currencyEntity <- getExistingCurrency[GetCurrencyError](currencyId)
    } yield currencyEntity.toCurrency

  override def getCurrencyAssociatedWithProject(projectId: ProjectId, currencyId: CurrencyId)(implicit
      ec: ExecutionContext): EitherT[Future, GetCurrencyAssociatedWithProjectError, Currency] =
    for {
      currencyEntity <- EitherT.fromOptionF[Future, GetCurrencyAssociatedWithProjectError, CurrencyEntity](
        currencyRepository.getCurrency(currencyId, Some(projectId)),
        CurrencyAssociatedWithProjectNotFoundError(projectId, currencyId))
    } yield currencyEntity.toCurrency

  override def createCurrencyWithAssociatedProjects(
      request: CreateCurrencyWithAssociatedProjectsRequest,
      userProjectId: ProjectId,
      userId: UserId,
      restrictedToProjectIds: Option[Set[ProjectId]])(implicit ec: ExecutionContext): Future[Currency] = {
    val updatedRequest = request.withAllowedAssociatedProjects(restrictedToProjectIds)
    currencyRepository.createCurrencyWithAssociatedProjects(updatedRequest, userProjectId, userId).map(_.toCurrency)
  }

  override def updateCurrencyWithAssociatedProjects(
      currencyId: CurrencyId,
      request: UpdateCurrencyWithAssociatedProjectsRequest,
      userProjectId: ProjectId,
      userId: UserId,
      restrictedToProjectIds: Option[Set[ProjectId]])(implicit
      ec: ExecutionContext): EitherT[Future, UpdateCurrencyError, Currency] =
    for {
      existingCurrency <- getExistingCurrency[UpdateCurrencyError](currencyId)
      updatedRequest = request.withAllowedAssociatedProjects(
        existingCurrency.associatedProjects,
        restrictedToProjectIds)
      updatedCurrencyEntity <- EitherT.liftF(
        currencyRepository.updateCurrencyWithAssociatedProjects(currencyId, updatedRequest, userProjectId, userId))
    } yield updatedCurrencyEntity.toCurrency

  override def deleteCurrencyProjectAssociation(projectId: ProjectId, currencyId: CurrencyId, userId: UserId)(implicit
      ec: ExecutionContext): EitherT[Future, DeleteCurrencyProjectAssociationError, Unit] =
    for {
      _ <- ensureCurrencyAssociatedWithProjectExists(projectId, currencyId)
      _ <- EitherT.liftF(currencyRepository.deleteCurrencyProjectAssociation(projectId, currencyId, userId))
    } yield ()

  override def getBalance(projectId: ProjectId, userId: UserId, currencyId: CurrencyId)(implicit
      ec: ExecutionContext): EitherT[Future, GetBalanceError, WalletBalanceInCurrency] = for {
    _ <- ensureCurrencyAssociatedWithProjectExists(projectId, currencyId)
    balance <- getBalanceInCurrency(userId, currencyId)
  } yield balance

  override def getBalances(projectId: ProjectId, userId: UserId)(implicit
      ec: ExecutionContext): EitherT[Future, GetBalancesError, WalletBalance] = for {
    currencies <- EitherT.liftF(currencyRepository.getCurrenciesAssociatedWithProject(projectId))
    currencyIds = currencies.map(_.publicId)
    balance <-
      if (currencies.isEmpty) EitherT {
        Future.successful[Either[GetBalancesError, Map[CurrencyId, BigDecimal]]](Right(Map.empty))
      }
      else getBalanceInAllCurrencies(userId)
  } yield {
    val foundBalanceValuesInCurrencies = balance.toList.collect {
      case (currencyId, amount) if currencyIds.contains(currencyId) =>
        WalletBalanceInCurrency(currencyId, amount)
    }
    val currenciesWithoutBalance =
      currencyIds.filterNot(currencyId => foundBalanceValuesInCurrencies.exists(_.currencyId == currencyId))
    val balanceValuesInCurrencies =
      foundBalanceValuesInCurrencies.appendedAll(currenciesWithoutBalance.map(WalletBalanceInCurrency(_, 0)))
    WalletBalance(balanceValuesInCurrencies.sortBy(_.currencyId))
  }

  override def transferFunds(
      projectId: ProjectId,
      requesterId: UserId,
      walletOwnerId: UserId,
      request: TransferFundsRequest)(implicit ec: ExecutionContext): EitherT[Future, TransferFundsError, Unit] =
    for {
      _ <- ensureCurrencyAssociatedWithProjectExists(projectId, request.currencyId)
      _ <- request.transferType match {
        case FundsTransferType.TopUpFunds =>
          topUpFunds(
            request.currencyId,
            request.amount,
            projectId,
            walletOwnerId,
            requesterId,
            request.externalTransactionId,
            request.title)
        case FundsTransferType.WithdrawFunds =>
          withdrawFunds(
            request.currencyId,
            request.amount,
            projectId,
            walletOwnerId,
            requesterId,
            request.externalTransactionId,
            request.title)
      }
    } yield ()

  override def getTransactionHistory(
      projectId: ProjectId,
      walletOwnerId: UserId,
      currencyId: CurrencyId,
      transactionTypes: Set[TransactionType],
      dateRangeStart: Option[OffsetDateTime],
      dateRangeEnd: Option[OffsetDateTime],
      sortFromNewestToOldest: Boolean)(implicit
      ec: ExecutionContext): EitherT[Future, GetTransactionHistoryError, Seq[Transaction]] =
    for {
      _ <- ensureCurrencyAssociatedWithProjectExists(projectId, currencyId)
      txEntities <- EitherT.liftF(
        transactionRepository.getTransactionHistory(
          walletOwnerId,
          currencyId,
          transactionTypes,
          dateRangeStart,
          dateRangeEnd,
          sortFromNewestToOldest))
    } yield txEntities.map(_.toTransaction)

  private def ensureCurrencyAssociatedWithProjectExists(projectId: ProjectId, currencyId: CurrencyId)(implicit
      ec: ExecutionContext): EitherT[Future, CurrencyAssociatedWithProjectNotFoundError, Unit] =
    EitherT {
      currencyRepository.checkCurrencyAssociatedWithProjectExists(projectId, currencyId).map { exists =>
        if (exists) Right(()) else Left(CurrencyAssociatedWithProjectNotFoundError(projectId, currencyId))
      }
    }

  private def getBalanceInCurrency(walletOwnerId: UserId, currencyId: CurrencyId)(implicit
      ec: ExecutionContext): EitherT[Future, GetBalanceError, WalletBalanceInCurrency] =
    runWalletCommand[GetBalanceError, WalletResponse.GetBalanceResponse, WalletBalanceInCurrency](
      WalletKey(walletOwnerId),
      replyTo => WalletCommand.GetBalance(currencyId, replyTo)) {
      case WalletResponse.GetBalanceValue(balance)   => Right(WalletBalanceInCurrency(currencyId, balance))
      case WalletResponse.BalanceForCurrencyNotFound => Right(WalletBalanceInCurrency(currencyId, 0))
    }

  private def getBalanceInAllCurrencies(userId: UserId)(implicit
      ec: ExecutionContext): EitherT[Future, GetBalancesError, Map[CurrencyId, BigDecimal]] =
    runWalletCommand[GetBalancesError, WalletResponse.GetBalancesResponse, Map[CurrencyId, BigDecimal]](
      WalletKey(userId),
      replyTo => WalletCommand.GetBalances(replyTo)) { case WalletResponse.GetBalancesValue(balance) =>
      Right(balance)
    }

  private def topUpFunds(
      currencyId: CurrencyId,
      amount: PositiveBigDecimal,
      projectId: ProjectId,
      walletOwnerId: UserId,
      requesterId: UserId,
      externalTransactionId: String,
      title: String)(implicit ec: ExecutionContext): EitherT[Future, TransferFundsError, Unit] =
    runWalletCommand[TransferFundsError, WalletResponse.TopUpFundsResponse, Unit](
      WalletKey(walletOwnerId),
      replyTo =>
        WalletCommand.TopUpFunds(
          currencyId,
          amount,
          projectId,
          walletOwnerId,
          requesterId,
          externalTransactionId,
          title,
          replyTo)) { case WalletResponse.TopUpFundsSucceeded =>
      Right(())
    }

  private def withdrawFunds(
      currencyId: CurrencyId,
      amount: PositiveBigDecimal,
      projectId: ProjectId,
      walletOwnerId: UserId,
      requesterId: UserId,
      externalTransactionId: String,
      title: String)(implicit ec: ExecutionContext): EitherT[Future, TransferFundsError, Unit] =
    runWalletCommand[TransferFundsError, WalletResponse.WithdrawFundsResponse, Unit](
      WalletKey(walletOwnerId),
      replyTo =>
        WalletCommand.WithdrawFunds(
          currencyId,
          amount,
          projectId,
          walletOwnerId,
          requesterId,
          externalTransactionId,
          title,
          replyTo)) {
      case WalletResponse.WithdrawFundsSucceeded => Right(())
      case WalletResponse.InsufficientFunds      => Left(InsufficientFundsError(walletOwnerId, currencyId))
    }

  private def runWalletCommand[WalletError >: UnexpectedWalletError, ActorResponse, Result](
      walletKeyKey: WalletKey,
      command: ActorRef[ActorResponse] => WalletCommand)(
      actorResponseHandler: PartialFunction[ActorResponse, Either[WalletError, Result]])(implicit
      ec: ExecutionContext): EitherT[Future, WalletError, Result] = {
    EitherT(walletRef(walletKeyKey).ask(command).transformWith {
      case Success(response) =>
        actorResponseHandler
          .lift(response)
          .map(result => Future.successful(result))
          .getOrElse(Future.successful(Left(UnexpectedWalletError(s"Received message $response"))))
      case Failure(exception) =>
        Future.successful(Left(UnexpectedWalletError("Failure when processing command", exception)))
    })
  }

  private def walletRef(walletKey: WalletKey): EntityRef[WalletCommand] =
    sharding.entityRefFor(WalletShardingRegion.TypeKey, walletKey.entityId.toString)

  private def getExistingCurrency[E >: CurrencyNotFoundError](currencyId: CurrencyId)(implicit
      ec: ExecutionContext): EitherT[Future, E, CurrencyEntity] = {
    EitherT.fromOptionF[Future, E, CurrencyEntity](
      currencyRepository.getCurrency(currencyId),
      CurrencyNotFoundError(currencyId))
  }
}
