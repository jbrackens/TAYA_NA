package stella.usercontext.models

import java.util.UUID

import akka.cluster.sharding.typed.scaladsl.EntityTypeKey
import akka.persistence.typed.PersistenceId
import sttp.tapir.Codec
import sttp.tapir.Codec.parsedString
import sttp.tapir.CodecFormat.TextPlain
import sttp.tapir.Schema
import sttp.tapir.SchemaType.SString

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

object Ids {

  object ProjectIdInstances {

    implicit lazy val projectIdSchema: Schema[ProjectId] = Schema[ProjectId](SString()).format("uuid")

    implicit lazy val projectIdCodec: Codec[String, ProjectId, TextPlain] =
      parsedString[ProjectId](str => ProjectId(UUID.fromString(str))).schema(projectIdSchema)
  }

  object UserIdInstances {

    implicit lazy val userIdSchema: Schema[UserId] = Schema[UserId](SString()).format("uuid")

    implicit lazy val userIdCodec: Codec[String, UserId, TextPlain] =
      parsedString[UserId](str => UserId(UUID.fromString(str))).schema(userIdSchema)
  }

  final case class UserContextKey(projectId: ProjectId, userId: UserId) {
    def entityId: String = s"$projectId${UserContextKey.entityIdPartsSeparator}$userId"
  }

  object UserContextKey {
    private val entityIdPartsSeparator = "∞"
    private val uuidPrefixLength = 36
    private val uuidPrefixWithSeparatorLength = uuidPrefixLength + entityIdPartsSeparator.length

    def apply(entityId: String): UserContextKey = {
      val projectId = ProjectId(UUID.fromString(entityId.take(uuidPrefixLength)))
      val userId = UserId(UUID.fromString(entityId.drop(uuidPrefixWithSeparatorLength)))
      UserContextKey(projectId, userId)
    }
  }

  object UserContextPersistenceId {
    private val persistenceIdSeparator = "~"

    def of(typeKey: EntityTypeKey[_], userContextKey: UserContextKey): PersistenceId = {
      PersistenceId.of(
        entityTypeHint = typeKey.name,
        entityId = userContextKey.entityId,
        separator = persistenceIdSeparator)
    }
  }
}
