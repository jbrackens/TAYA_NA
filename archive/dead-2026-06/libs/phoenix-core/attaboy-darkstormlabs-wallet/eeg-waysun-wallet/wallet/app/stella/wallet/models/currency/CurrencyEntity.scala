package stella.wallet.models.currency

import java.time.OffsetDateTime

import stella.common.models.Ids.ProjectId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.Ids.CurrencyInternalId

final case class CurrencyEntity(
    id: CurrencyInternalId,
    publicId: CurrencyId,
    name: String,
    verboseName: String,
    symbol: String,
    associatedProjects: List[ProjectId],
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime) {

  def toCurrency: Currency = Currency(
    id = publicId,
    name = name,
    verboseName = verboseName,
    symbol = symbol,
    associatedProjects = associatedProjects,
    createdAt = createdAt,
    updatedAt = updatedAt)
}
