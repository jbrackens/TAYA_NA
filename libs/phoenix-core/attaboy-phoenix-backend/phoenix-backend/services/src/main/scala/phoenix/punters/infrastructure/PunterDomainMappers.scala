package phoenix.punters.infrastructure

import enumeratum.SlickEnumSupport

import phoenix.core.persistence.ExtendedPostgresProfile
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.punters.domain.Confidence
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.LimitPeriodType
import phoenix.punters.domain.ResponsibleGamblingLimitType
import phoenix.punters.domain.VisitorId

object PunterDomainMappers extends SlickEnumSupport {

  override val profile = ExtendedPostgresProfile

  implicit val responsibleGamblingLimitTypeMapper: BaseColumnType[ResponsibleGamblingLimitType] =
    mappedColumnTypeForEnum(ResponsibleGamblingLimitType)

  implicit val limitPeriodTypeMapper: BaseColumnType[LimitPeriodType] = mappedColumnTypeForEnum(LimitPeriodType)
  implicit val coolOffCauseMapper: BaseColumnType[CoolOffCause] = mappedColumnTypeForEnum(CoolOffCause)

  implicit val visitorIdTypeMapper: BaseColumnType[VisitorId] =
    MappedColumnType.base[VisitorId, String](_.value, VisitorId.unsafe)
  implicit val confidenceTypeMapper: BaseColumnType[Confidence] =
    MappedColumnType.base[Confidence, Float](_.value, Confidence.unsafe)
}
