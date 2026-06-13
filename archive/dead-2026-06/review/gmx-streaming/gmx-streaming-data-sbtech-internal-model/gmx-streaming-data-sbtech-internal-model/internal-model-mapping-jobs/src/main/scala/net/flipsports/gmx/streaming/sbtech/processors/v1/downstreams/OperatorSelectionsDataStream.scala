package net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams


import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.sbtech.Implicits.OperatorSelections.{input, output}
import net.flipsports.gmx.streaming.sbtech.Types.OperatorSelections._
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.processors.v1.{MapperBusinessParameters, TypedKeySpecificValueModelMapper}


class OperatorSelectionsDataStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends TypedKeySpecificValueModelMapper[SourceKey, SourceValue, TargetKey, TargetValue](MapperBusinessParameters.OperatorSelections(configuration), metaParameters, businessMetaParameters, configuration) {

}

object OperatorSelectionsDataStream {

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: SbTechConfig): Unit = new OperatorSelectionsDataStream(metaParameters, businessMetaParameters, config).stream()

}

