package stella.usercontext.models

import io.circe.Json

sealed trait UserContextState extends StellaCirceAkkaSerializable

object UserContextState {
  case class UserData private (value: Json) extends UserContextState {
    def mergedWith(diff: Json): UserData = UserData(value.deepMerge(diff))
  }

  object UserData {
    val empty: UserData = UserData(Json.obj())

    def apply(value: Json): UserData = new UserData(value.deepDropNullValues)
  }
}
