package net.flipsports.gmx.streaming.common.job

trait RowMapper[SOURCE, CONFIG, TARGET, BRAND] {

  def mapToTarget: (SOURCE, CONFIG, BRAND) => TARGET
}
