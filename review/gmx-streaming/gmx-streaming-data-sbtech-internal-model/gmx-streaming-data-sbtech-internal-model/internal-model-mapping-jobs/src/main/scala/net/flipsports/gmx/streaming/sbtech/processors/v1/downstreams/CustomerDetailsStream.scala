package net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams

import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.sbtech.Implicits.CustomerDetail.{input, output}
import net.flipsports.gmx.streaming.sbtech.Types.CustomerDetail._
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.processors.v1.{MapperBusinessParameters, TypedKeySpecificValueModelMapper}


class CustomerDetailsStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends TypedKeySpecificValueModelMapper[SourceKey, SourceValue, TargetKey, TargetValue](MapperBusinessParameters.CustomerDetailParams(configuration), metaParameters, businessMetaParameters, configuration) {

}

object CustomerDetailsStream {

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: SbTechConfig): Unit = new CustomerDetailsStream(metaParameters, businessMetaParameters, config).stream()

}


