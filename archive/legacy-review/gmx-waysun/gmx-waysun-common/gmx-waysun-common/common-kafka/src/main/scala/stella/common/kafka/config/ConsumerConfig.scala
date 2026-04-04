package stella.common.kafka.config

import scala.concurrent.duration.FiniteDuration

final case class ConsumerConfig(clientId: String, groupId: String, kafkaPollTimeout: FiniteDuration)
