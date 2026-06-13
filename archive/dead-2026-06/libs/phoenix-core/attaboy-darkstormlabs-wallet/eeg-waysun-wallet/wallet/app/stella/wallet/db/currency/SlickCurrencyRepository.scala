package stella.wallet.db.currency

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import pl.iterators.kebs.tagged.slick.SlickSupport
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import stella.common.core.Clock
import stella.common.core.OffsetDateTimeUtils
import stella.common.models.Ids._

import stella.wallet.db.CommonMappers
import stella.wallet.db.ExtendedPostgresProfile.api._
import stella.wallet.models.Ids._
import stella.wallet.models.currency._
import stella.wallet.services.CurrencyIdProvider

class SlickCurrencyRepository(
    dbConfig: DatabaseConfig[JdbcProfile],
    clock: Clock,
    currencyIdProvider: CurrencyIdProvider)
    extends CurrencyRepository
    with CommonMappers
    with SlickSupport {

  import SlickCurrencyRepository._
  import dbConfig._

  override def checkCurrencyAssociatedWithProjectExists(projectId: ProjectId, currencyId: CurrencyId)(implicit
      ec: ExecutionContext): Future[Boolean] =
    db.run {
      currencyByPublicIdAndProjectExistsCompiledQuery((currencyId, List(projectId))).result
    }

  override def checkCurrencyExists(currencyId: CurrencyId)(implicit ec: ExecutionContext): Future[Boolean] =
    db.run {
      currencyByPublicIdExistsCompiledQuery(currencyId).result
    }

  override def getCurrenciesAssociatedWithProject(projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Seq[CurrencyEntity]] =
    db.run {
      currenciesAssociatedWithProjectCompiledQuery(List(projectId)).result
    }

  override def getAllCurrencies()(implicit ec: ExecutionContext): Future[Seq[CurrencyEntity]] =
    db.run {
      sortedCurrenciesCompiledQuery.result
    }

  override def getCurrency(currencyId: CurrencyId, projectIdOpt: Option[ProjectId])(implicit
      ec: ExecutionContext): Future[Option[CurrencyEntity]] =
    db.run {
      currencyTable
        .filter(_.publicId === currencyId)
        .filterOpt(projectIdOpt)((currency, projectId) => currency.associatedProjects @> List(projectId).take(1))
        .result
        .headOption
    }

  override def createCurrencyWithAssociatedProjects(
      request: CreateCurrencyWithAssociatedProjectsRequest,
      userProjectId: ProjectId,
      userId: UserId)(implicit ec: ExecutionContext): Future[CurrencyEntity] = {
    val currentDateTime = clock.currentUtcOffsetDateTime()
    val currency = CurrencyEntity(
      CurrencyInternalId(0),
      currencyIdProvider.generateId(),
      request.name,
      request.verboseName,
      request.symbol,
      request.associatedProjects,
      currentDateTime,
      currentDateTime)
    createCurrencyAndUpdateChangelog(currency, userProjectId, userId)
  }

  override def updateCurrencyWithAssociatedProjects(
      currencyId: CurrencyId,
      request: UpdateCurrencyWithAssociatedProjectsRequest,
      userProjectId: ProjectId,
      userId: UserId)(implicit ec: ExecutionContext): Future[CurrencyEntity] =
    db.run {
      val currentDateTime = clock.currentUtcOffsetDateTime()
      (for {
        _: Int <- currencyTable
          .filter(currency => currency.publicId === currencyId)
          .map(currency =>
            (currency.name, currency.verboseName, currency.symbol, currency.associatedProjects, currency.updatedAt))
          .update((request.name, request.verboseName, request.symbol, request.associatedProjects, currentDateTime))
        updatedCurrency: CurrencyEntity <- getCurrencyQuery(currencyId)
        _: CurrencyChangelogEntry <- createCurrencyChangelogEntryQuery(
          updatedCurrency,
          userProjectId,
          userId,
          currentDateTime)
      } yield updatedCurrency).transactionally
    }

  override def deleteCurrencyProjectAssociation(projectId: ProjectId, currencyId: CurrencyId, userId: UserId)(implicit
      ec: ExecutionContext): Future[Unit] =
    db.run {
      val currentDateTime = clock.currentUtcOffsetDateTime()
      (for {
        currency <- getCurrencyQuery(currencyId)
        _ <- currencyTable
          .filter(currency => currency.publicId === currencyId)
          .map(currency => (currency.associatedProjects, currency.updatedAt))
          .update((currency.associatedProjects.filterNot(_ == projectId), currentDateTime))
        updatedCurrency <- getCurrencyQuery(currencyId)
        _ <- createCurrencyChangelogEntryQuery(updatedCurrency, projectId, userId, currentDateTime)
      } yield ()).transactionally
    }

  override def getCurrencyChangelog(currencyId: CurrencyId)(implicit
      ec: ExecutionContext): Future[Seq[CurrencyChangelogEntry]] =
    db.run {
      compiledCurrencyChangelogQuery(currencyId).result
    }

  private def createCurrencyAndUpdateChangelog(currency: CurrencyEntity, userProjectId: ProjectId, userId: UserId)(
      implicit ec: ExecutionContext): Future[CurrencyEntity] =
    db.run {
      val currentDateTime = clock.currentUtcOffsetDateTime()
      (for {
        storedCurrency <- currencyTable
          .returning(currencyTable.map(_.id))
          .into((ce: CurrencyEntity, id: CurrencyInternalId) => ce.copy(id = id)) += currency
        _ <- createCurrencyChangelogEntryQuery(storedCurrency, userProjectId, userId, currentDateTime)
      } yield storedCurrency).transactionally
    }

  private def getCurrencyQuery(currencyId: CurrencyId) =
    currencyTable.filter(_.publicId === currencyId).result.head

  private def createCurrencyChangelogEntryQuery(
      storedCurrency: CurrencyEntity,
      userProjectId: ProjectId,
      userId: UserId,
      currentDateTime: OffsetDateTime) =
    currencyChangelogTable
      .returning(currencyChangelogTable.map(_.id))
      .into((cce: CurrencyChangelogEntry, id: CurrencyChangelogEntryId) => cce.copy(id = id)) +=
      CurrencyChangelogEntry(
        id = CurrencyChangelogEntryId(0),
        currencyId = storedCurrency.id,
        currencyPublicId = storedCurrency.publicId,
        userProjectId = userProjectId,
        userId = userId,
        name = storedCurrency.name,
        verboseName = storedCurrency.verboseName,
        symbol = storedCurrency.symbol,
        associatedProjects = storedCurrency.associatedProjects,
        createdAt = currentDateTime)
}

object SlickCurrencyRepository extends CommonMappers with SlickSupport {

  private type CurrencyTableRow =
    (CurrencyInternalId, CurrencyId, String, String, String, List[ProjectId], OffsetDateTime, OffsetDateTime)

  private type CurrencyChangelogTableRow = (
      CurrencyChangelogEntryId,
      CurrencyInternalId,
      CurrencyId,
      ProjectId,
      UserId,
      String,
      String,
      String,
      List[ProjectId],
      OffsetDateTime)

  private class CurrencyTable(tag: Tag) extends Table[CurrencyEntity](tag, "currencies") {
    def id = column[CurrencyInternalId]("id", O.PrimaryKey, O.AutoInc)
    def publicId = column[CurrencyId]("public_id")
    def name = column[String]("name")
    def verboseName = column[String]("verbose_name")
    def symbol = column[String]("symbol")
    def associatedProjects = column[List[ProjectId]]("associated_projects")
    def createdAt = column[OffsetDateTime]("created_at")
    def updatedAt = column[OffsetDateTime]("updated_at")

    def * =
      (id, publicId, name, verboseName, symbol, associatedProjects, createdAt, updatedAt)
        .<>(fromCurrencyTableRow, CurrencyEntity.unapply)

    private def fromCurrencyTableRow(row: CurrencyTableRow): CurrencyEntity = row match {
      case (currencyInternalId, currencyId, name, verboseName, symbol, associatedProjects, createdAt, updatedAt) =>
        CurrencyEntity(
          currencyInternalId,
          currencyId,
          name,
          verboseName,
          symbol,
          associatedProjects,
          OffsetDateTimeUtils.asUtc(createdAt),
          OffsetDateTimeUtils.asUtc(updatedAt))
    }
  }

  private class CurrencyChangelogTable(tag: Tag) extends Table[CurrencyChangelogEntry](tag, "currency_changelog") {
    def id = column[CurrencyChangelogEntryId]("id", O.PrimaryKey, O.AutoInc)
    def currencyId = column[CurrencyInternalId]("currency_id")
    def currencyPublicId = column[CurrencyId]("currency_public_id")
    def userProjectId = column[ProjectId]("user_project_id")
    def userId = column[UserId]("user_id")
    def name = column[String]("name")
    def verboseName = column[String]("verbose_name")
    def symbol = column[String]("symbol")
    def associatedProjects = column[List[ProjectId]]("associated_projects")
    def createdAt = column[OffsetDateTime]("created_at")

    def * =
      (
        id,
        currencyId,
        currencyPublicId,
        userProjectId,
        userId,
        name,
        verboseName,
        symbol,
        associatedProjects,
        createdAt).<>(fromCurrencyChangelogTableRow, CurrencyChangelogEntry.unapply)

    private def fromCurrencyChangelogTableRow(row: CurrencyChangelogTableRow): CurrencyChangelogEntry = row match {
      case (
            entryId,
            currencyInternalId,
            currencyId,
            userProjectId,
            userId,
            name,
            verboseName,
            symbol,
            associatedProjects,
            createdAt) =>
        CurrencyChangelogEntry(
          entryId,
          currencyInternalId,
          currencyId,
          userProjectId,
          userId,
          name,
          verboseName,
          symbol,
          associatedProjects,
          OffsetDateTimeUtils.asUtc(createdAt))
    }
  }

  private val currencyTable = TableQuery[CurrencyTable]
  private val currencyChangelogTable = TableQuery[CurrencyChangelogTable]

  // --------------- queries ---------------
  private def currencyChangelogQuery(
      currencyId: Rep[CurrencyId]): Query[CurrencyChangelogTable, CurrencyChangelogEntry, Seq] =
    currencyChangelogTable.filter(_.currencyPublicId === currencyId).sortBy(_.id)

  private val compiledCurrencyChangelogQuery = Compiled(currencyChangelogQuery _)

  private def currenciesAssociatedWithProjectQuery(
      projectIds: Rep[List[ProjectId]]): Query[CurrencyTable, CurrencyEntity, Seq] =
    currencyTable.filter(_.associatedProjects @> projectIds).sortBy(_.id)

  private val currenciesAssociatedWithProjectCompiledQuery = Compiled(currenciesAssociatedWithProjectQuery _)

  private def currencyByPublicIdExistsQuery(currencyId: Rep[CurrencyId]): Rep[Boolean] =
    currencyTable.filter(_.publicId === currencyId).exists

  private val currencyByPublicIdExistsCompiledQuery = Compiled(currencyByPublicIdExistsQuery _)

  private def currencyByPublicIdAndProjectExistsQuery(
      currencyId: Rep[CurrencyId],
      projectIds: Rep[List[ProjectId]]): Rep[Boolean] = currencyTable
    .filter(currency => currency.publicId === currencyId && currency.associatedProjects @> projectIds)
    .exists

  private val currencyByPublicIdAndProjectExistsCompiledQuery = Compiled(currencyByPublicIdAndProjectExistsQuery _)

  private def sortedCurrenciesQuery(): Query[CurrencyTable, CurrencyEntity, Seq] = currencyTable.sortBy(_.id)

  private val sortedCurrenciesCompiledQuery = Compiled(sortedCurrenciesQuery())
}
