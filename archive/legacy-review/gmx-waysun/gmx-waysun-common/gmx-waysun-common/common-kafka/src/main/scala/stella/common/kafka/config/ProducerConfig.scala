package stella.common.kafka.config

import scala.concurrent.duration.FiniteDuration

// for more details see https://kafka.apache.org/20/documentation.html#producerconfigs (note we use an old version)
final case class ProducerConfig(
    acks: String,
    clientId: String,
    compressionType: String,
    maxInFlightRequestsPerConnection: Int,
    maxNumberOfRetries: Option[Int],
    publicationTimeLimit: Option[FiniteDuration],
    lingerMs: Option[Int],
    batchSize: Option[Int])
