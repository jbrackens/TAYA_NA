package net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams

import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.sbtech.Implicits.SettlementData.{input, output}
import net.flipsports.gmx.streaming.sbtech.Types.SettlementData._
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.processors.v1.{MapperBusinessParameters, TypedKeySpecificValueModelMapper}

class SettlementDataStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)

  extends TypedKeySpecificValueModelMapper[SourceKey, SourceValue, TargetKey, TargetValue](MapperBusinessParameters.SportBets(configuration), metaParameters, businessMetaParameters, configuration) {

}


object SettlementDataStream {

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: SbTechConfig): Unit = new SettlementDataStream(metaParameters, businessMetaParameters, config).stream()

}
