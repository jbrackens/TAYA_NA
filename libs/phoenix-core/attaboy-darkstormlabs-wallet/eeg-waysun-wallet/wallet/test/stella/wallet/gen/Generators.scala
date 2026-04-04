package stella.wallet.gen

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Date
import java.util.UUID

import org.scalacheck.Arbitrary
import org.scalacheck.Gen

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.Ids.TransactionId
import stella.wallet.models.currency._
import stella.wallet.models.transaction.Transaction
import stella.wallet.models.transaction.TransactionEntity
import stella.wallet.models.transaction.TransactionType
import stella.wallet.models.wallet.FundsTransferType
import stella.wallet.models.wallet.PositiveBigDecimal
import stella.wallet.models.wallet.TransferFundsRequest
import stella.wallet.models.wallet.WalletBalance
import stella.wallet.models.wallet.WalletBalanceInCurrency
import stella.wallet.routes.TestConstants._

object Generators {

  lazy val currenciesSeqGen: Gen[Seq[Currency]] = Gen.listOf(currencyGen)

  lazy val currencyIdGen: Gen[CurrencyId] = Arbitrary.arbUuid.arbitrary.map(CurrencyId.apply)

  lazy val currencyGen: Gen[Currency] =
    for {
      id <- currencyIdGen
      name <- currencyNameGen
      verboseName <- currencyVerboseNameGen
      symbol <- currencySymbolGen
      associatedProjects <- projectIdListGen
      createdAt <- offsetDateTimeGen
      updatedAt <- offsetDateTimeGen
    } yield Currency(id, name, verboseName, symbol, associatedProjects, createdAt, updatedAt)

  lazy val currencyNameGen: Gen[String] = stringGen(maxSize = maxCurrencyNameLength, minSize = 1)

  lazy val currencyVerboseNameGen: Gen[String] = stringGen(maxSize = maxCurrencyVerboseNameLength, minSize = 1)

  lazy val currencySymbolGen: Gen[String] = stringGen(maxSize = maxCurrencySymbolLength, minSize = 1)

  lazy val projectIdListGen: Gen[List[ProjectId]] = Gen.listOf(projectIdGen)

  lazy val projectIdGen: Gen[ProjectId] = Arbitrary.arbUuid.arbitrary.map(ProjectId.apply)

  lazy val offsetDateTimeGen: Gen[OffsetDateTime] =
    Gen.choose(min = 1, max = System.currentTimeMillis()).flatMap { timestamp =>
      OffsetDateTime.ofInstant(new Date(timestamp).toInstant, ZoneOffset.UTC)
    }

  lazy val createCurrencyWithAssociatedProjectsRequestGen: Gen[CreateCurrencyWithAssociatedProjectsRequest] =
    for {
      name <- currencyNameGen
      verboseName <- currencyVerboseNameGen
      symbol <- currencySymbolGen
      associatedProjects <- projectIdListGen
    } yield CreateCurrencyWithAssociatedProjectsRequest(name, verboseName, symbol, associatedProjects)

  lazy val updateCurrencyWithAssociatedProjectsRequestGen: Gen[UpdateCurrencyWithAssociatedProjectsRequest] =
    for {
      name <- currencyNameGen
      verboseName <- currencyVerboseNameGen
      symbol <- currencySymbolGen
      associatedProjects <- projectIdListGen
    } yield UpdateCurrencyWithAssociatedProjectsRequest(name, verboseName, symbol, associatedProjects)

  lazy val walletBalanceGen: Gen[WalletBalance] = Gen.listOf(walletBalanceInCurrencyGen).map(WalletBalance.apply)

  lazy val walletBalanceInCurrencyGen: Gen[WalletBalanceInCurrency] = for {
    balanceValue <- Arbitrary.arbBigDecimal.arbitrary
  } yield WalletBalanceInCurrency(CurrencyId.random(), balanceValue)

  lazy val userIdGen: Gen[UserId] = Gen.uuid.map(UserId.apply)

  lazy val transferFundsRequestGen: Gen[TransferFundsRequest] = for {
    transferType <- fundsTransferTypeGen
    externalTransactionId <- externalTransactionIdGen
    title <- titleGen
    currencyId <- currencyIdGen
    amount <- positiveBigDecimalGen
  } yield TransferFundsRequest(transferType, externalTransactionId, title, currencyId, amount)

  lazy val externalTransactionIdGen: Gen[String] = stringGen(minSize = 1, maxSize = maxExternalTransactionIdLength)

  lazy val titleGen: Gen[String] = stringGen(minSize = 1, maxSize = maxTitleLength)

  lazy val plainPositiveBigDecimalGen: Gen[BigDecimal] =
    Arbitrary.arbBigDecimal.arbitrary.suchThat(_ > 0)

  lazy val plainNegativeBigDecimalGen: Gen[BigDecimal] =
    Arbitrary.arbBigDecimal.arbitrary.suchThat(_ < 0)

  lazy val positiveBigDecimalGen: Gen[PositiveBigDecimal] =
    plainPositiveBigDecimalGen.map(PositiveBigDecimal.apply)

  lazy val fundsTransferTypeGen: Gen[FundsTransferType] = Gen.oneOf(FundsTransferType.values)

  lazy val transactionEntityGen: Gen[TransactionEntity] =
    for {
      id <- transactionIdGen
      transactionType <- transactionTypeGen
      currencyId <- currencyIdGen
      amount <-
        if (transactionType == TransactionType.Withdraw) plainNegativeBigDecimalGen else plainPositiveBigDecimalGen
      exchangeToCurrencyId <-
        if (transactionType == TransactionType.Exchange) Gen.some(currencyIdGen) else Gen.const(None)
      exchangeRate <-
        if (transactionType == TransactionType.Exchange) Gen.some(positiveBigDecimalGen) else Gen.const(None)
      projectId <- projectIdGen
      walletOwnerId <- userIdGen
      requesterId <- userIdGen
      externalTransactionId <-
        if (transactionType != TransactionType.Exchange) Gen.some(externalTransactionIdGen) else Gen.const(None)
      title <- if (transactionType != TransactionType.Exchange) Gen.some(titleGen) else Gen.const(None)
      transactionDate <- offsetDateTimeGen
      createdAt <- offsetDateTimeGen
    } yield TransactionEntity(
      id,
      transactionType,
      currencyId,
      amount,
      exchangeToCurrencyId,
      exchangeRate,
      projectId,
      walletOwnerId,
      requesterId,
      externalTransactionId,
      title,
      transactionDate,
      createdAt)

  lazy val transactionGen: Gen[Transaction] = transactionEntityGen.map(_.toTransaction)

  lazy val transactionIdGen: Gen[TransactionId] = Arbitrary.arbLong.arbitrary.map(TransactionId.apply)

  lazy val transactionTypeGen: Gen[TransactionType] = Gen.oneOf(TransactionType.values)

  def stringGen(maxSize: Int = 32, minSize: Int = 0): Gen[String] =
    Gen.choose(min = minSize, max = maxSize).flatMap { size =>
      Gen.stringOfN(size, Gen.alphaNumChar)
    }
}
