package net.flipsports.gmx.streaming.idefix.processors.v1.downstreams

import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.idefix.Implicits.Event.{input, output}
import net.flipsports.gmx.streaming.idefix.Types.Event._
import net.flipsports.gmx.streaming.idefix.configs.IdefixConfig
import net.flipsports.gmx.streaming.idefix.processors.v1.{MapperBusinessParameters, TypedKeySpecificValueModelMapper}


class EventStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: IdefixConfig)
  extends TypedKeySpecificValueModelMapper[SourceKey, SourceValue, TargetKey, TargetValue](MapperBusinessParameters.CasinoBetParams(configuration), metaParameters,businessMetaParameters, configuration) {

}

object EventStream {

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: IdefixConfig): Unit = new EventStream(metaParameters, businessMetaParameters, config).stream()

}
