package net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams


import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.sbtech.Implicits.Logins.{input, output}
import net.flipsports.gmx.streaming.sbtech.Types.Logins._
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.processors.v1.{MapperBusinessParameters, TypedKeySpecificValueModelMapper}


class LoginsDataStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends TypedKeySpecificValueModelMapper[SourceKey, SourceValue, TargetKey, TargetValue](MapperBusinessParameters.Logins(configuration), metaParameters, businessMetaParameters, configuration) {

}

object LoginsDataStream {

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: SbTechConfig): Unit = new LoginsDataStream(metaParameters, businessMetaParameters, config).stream()

}



