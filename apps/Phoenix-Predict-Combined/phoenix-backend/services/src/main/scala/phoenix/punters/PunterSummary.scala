package phoenix.punters

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.Email
import phoenix.punters.domain.FirstName
import phoenix.punters.domain.LastName
import phoenix.punters.domain.Username

final case class PunterSummary(
    id: PunterId,
    username: Username,
    firstName: FirstName,
    lastName: LastName,
    email: Email,
    dateOfBirth: DateOfBirth,
    isTestAccount: Boolean)
