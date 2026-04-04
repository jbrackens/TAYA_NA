package stella.events.config

import enumeratum.EnumEntry._
import enumeratum._

sealed trait EventPublicationMode extends EnumEntry with LowerCamelcase

object EventPublicationMode extends Enum[EventPublicationMode] {
  val values: IndexedSeq[EventPublicationMode] = findValues

  case object PublishDirectlyToKafka extends EventPublicationMode
  case object StoreInRedis extends EventPublicationMode
  case object StoreInRedisAndStartKafkaPublicationService extends EventPublicationMode
}
