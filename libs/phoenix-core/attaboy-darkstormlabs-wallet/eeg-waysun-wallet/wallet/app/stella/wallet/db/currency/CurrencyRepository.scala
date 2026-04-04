package stella.wallet.db.currency

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import stella.common.models.Ids._

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.currency._

trait CurrencyRepository {

  def checkCurrencyAssociatedWithProjectExists(projectId: ProjectId, currencyId: CurrencyId)(implicit
      ec: ExecutionContext): Future[Boolean]

  def checkCurrencyExists(currencyId: CurrencyId)(implicit ec: ExecutionContext): Future[Boolean]

  def getCurrenciesAssociatedWithProject(projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Seq[CurrencyEntity]]

  def getAllCurrencies()(implicit ec: ExecutionContext): Future[Seq[CurrencyEntity]]

  def getCurrency(currencyId: CurrencyId, projectId: Option[ProjectId] = None)(implicit
      ec: ExecutionContext): Future[Option[CurrencyEntity]]

  def createCurrencyWithAssociatedProjects(
      request: CreateCurrencyWithAssociatedProjectsRequest,
      userProjectId: ProjectId,
      userId: UserId)(implicit ec: ExecutionContext): Future[CurrencyEntity]

  def updateCurrencyWithAssociatedProjects(
      currencyId: CurrencyId,
      request: UpdateCurrencyWithAssociatedProjectsRequest,
      userProjectId: ProjectId,
      userId: UserId)(implicit ec: ExecutionContext): Future[CurrencyEntity]

  def deleteCurrencyProjectAssociation(projectId: ProjectId, currencyId: CurrencyId, userId: UserId)(implicit
      ec: ExecutionContext): Future[Unit]

  // to be used in the tests
  def getCurrencyChangelog(currencyId: CurrencyId)(implicit ec: ExecutionContext): Future[Seq[CurrencyChangelogEntry]]
}
