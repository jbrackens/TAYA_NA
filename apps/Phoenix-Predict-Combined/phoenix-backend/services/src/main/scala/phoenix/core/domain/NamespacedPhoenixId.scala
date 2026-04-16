package phoenix.core.domain

import cats.data.Validated
import cats.syntax.validated._

import phoenix.sharding.PhoenixId

trait NamespacedPhoenixId {
  this: PhoenixId =>
  def value: String = s"${entityType.prefix}:${provider.prefix}:$id"
  val id: String
  val provider: DataProvider
  val entityType: EntityType
}
object NamespacedPhoenixId {
  val namespacedIdRegex = "([a-z]+):([a-z]+):(.+)".r

  def unsafeParse[T <: NamespacedPhoenixId](f: (DataProvider, String) => T)(namespacedId: String) = {
    parse(f)(namespacedId).valueOr(error => throw new IllegalArgumentException(error))
  }

  def parse[T <: NamespacedPhoenixId](f: (DataProvider, String) => T)(namespacedId: String): Validated[String, T] =
    namespacedId match {
      case namespacedIdRegex(entityType, provider, id) =>
        Validated.fromOption(DataProvider.withPrefix(provider), s"Provider $provider is not valid").andThen {
          provider =>
            val parsedId = f(provider, id)
            if (parsedId.entityType.prefix == entityType) parsedId.valid
            else
              s"Entity prefix '${parsedId.entityType.prefix}' is not valid for provided id: $namespacedId".invalid
        }
      case _ => s"Id is not a valid namespaced id: $namespacedId".invalid
    }
}
