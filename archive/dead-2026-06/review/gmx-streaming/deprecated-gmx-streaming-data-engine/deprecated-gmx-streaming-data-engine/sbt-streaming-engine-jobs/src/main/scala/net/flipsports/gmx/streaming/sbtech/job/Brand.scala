package net.flipsports.gmx.streaming.sbtech.job

import net.flipsports.gmx.streaming.sbtech.configs.{SbTechConfig, SourceBrand}

trait Brand {
  def brand()(implicit sbtTechConfig: SbTechConfig): SourceBrand
}

trait RedZoneSports extends Brand {
  override def brand()(implicit sbtTechConfig: SbTechConfig): SourceBrand = sbtTechConfig.sources.redZoneSports
}

trait SportsNation extends Brand {
  override def brand()(implicit sbtTechConfig: SbTechConfig): SourceBrand = sbtTechConfig.sources.sportNation

}


trait EmptyBrand extends Brand {
  override def brand()(implicit sbtTechConfig: SbTechConfig): SourceBrand = sbtTechConfig.sources.emptyBrand
}