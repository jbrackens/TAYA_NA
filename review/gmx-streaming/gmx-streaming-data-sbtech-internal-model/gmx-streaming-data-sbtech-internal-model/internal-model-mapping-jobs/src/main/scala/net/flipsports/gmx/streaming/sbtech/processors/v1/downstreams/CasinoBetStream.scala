package net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams

import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.sbtech.Implicits.CasinoBet.{input, output}
import net.flipsports.gmx.streaming.sbtech.Types.CasinoBet._
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.processors.v1.{MapperBusinessParameters, TypedKeySpecificValueModelMapper}


class CasinoBetStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends TypedKeySpecificValueModelMapper[SourceKey, SourceValue, TargetKey, TargetValue](MapperBusinessParameters.CasinoBetParams(configuration), metaParameters,businessMetaParameters, configuration) {

}

object CasinoBetStream {

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: SbTechConfig): Unit = new OperatorEventsDataStream(metaParameters, businessMetaParameters, config).stream()

}
