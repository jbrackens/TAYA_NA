package net.flipsports.gmx.streaming.idefix.processors.v1

import net.flipsports.gmx.streaming.idefix.Types
import net.flipsports.gmx.streaming.idefix.configs.IdefixConfig
import org.apache.avro.specific.SpecificRecord

case class MapperBusinessParameters[K, V <: SpecificRecord, TK <: SpecificRecord, TV <: SpecificRecord](
 sourceTopic: String,
 targetTopic: String,
 sourceKeyClass: Class[K],
 sourceValueClass: Class[V],
 targetKeyClass: Class[TK],
 targetValueCLass: Class[TV],
 keyMapper: (K, TV) => TK
) extends Serializable


object MapperBusinessParameters {

  object CasinoBetParams {
    import Types.Event._

    def apply(configuration: IdefixConfig): MapperBusinessParameters[SourceKey, SourceValue, TargetKey, TargetValue] = new MapperBusinessParameters(
      sourceTopic = configuration.sourceTopics.events,
      targetTopic = configuration.targetTopics.events,
      sourceKeyClass = classOf[SourceKey],
      sourceValueClass = classOf[SourceValue],
      targetKeyClass = classOf[TargetKey],
      targetValueCLass = classOf[TargetValue],
      keyMapper = (_, i) => new TargetKey(i.getCustomerId)
    )
  }

}