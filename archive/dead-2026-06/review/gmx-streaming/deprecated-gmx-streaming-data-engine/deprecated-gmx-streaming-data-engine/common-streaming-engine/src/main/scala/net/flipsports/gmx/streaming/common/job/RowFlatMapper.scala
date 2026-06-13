package net.flipsports.gmx.streaming.common.job

trait RowFlatMapper[SOURCE, CONFIG, TARGET, BRAND] {

  def mapToTarget: (SOURCE, CONFIG, BRAND) => Seq[TARGET]
}
