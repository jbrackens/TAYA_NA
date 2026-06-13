package kafka.utils

import java.util.Properties

/**
 * Due to bug in avro deserializer its present here :> https://github.com/confluentinc/schema-registry/issues/553
 */
class VerifiableProperties extends Properties {

}
