package stella.common.models

import java.util.UUID

import pl.iterators.kebs.tag.meta.tagged
import pl.iterators.kebs.tagged._

@tagged object Ids {

  trait ProjectIdTag
  trait UserIdTag
  type ProjectId = UUID @@ ProjectIdTag
  type UserId = UUID @@ UserIdTag

  object UserId extends RandomIdGenerator[UserId]
  object ProjectId extends RandomIdGenerator[ProjectId]
}
