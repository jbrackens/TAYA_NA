package stella.wallet.models.currency

import java.time.OffsetDateTime

import stella.common.models.Ids._

import stella.wallet.models.Ids._

final case class CurrencyChangelogEntry(
    id: CurrencyChangelogEntryId,
    currencyId: CurrencyInternalId,
    currencyPublicId: CurrencyId,
    userProjectId: ProjectId,
    userId: UserId,
    name: String,
    verboseName: String,
    symbol: String,
    associatedProjects: List[ProjectId],
    createdAt: OffsetDateTime)
