package eeg.waysun.events.validators.splits

import eeg.waysun.events.validators.Types.Definition
import eeg.waysun.events.validators.{Implicits, Types}
import org.apache.flink.api.common.state.{MapStateDescriptor, ValueStateDescriptor}
object Descriptors {

  val definitions: MapStateDescriptor[Definition.KeyType, Types.Definition.KeyedType] =
    new MapStateDescriptor(
      "eeg-streaming.events-definitions",
      Implicits.DefinitionImplicit.key,
      Implicits.DefinitionImplicit.keyed)

  val lastFiringTime: ValueStateDescriptor[Long] =
    new ValueStateDescriptor("eeg-streaming-events-last-firing-time", classOf[Long])

}
