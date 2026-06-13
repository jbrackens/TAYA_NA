package net.flipsports.gmx.streaming.common.job

trait FilterRow[SOURCE, CONFIG, TARGET] {

  def filterTargetRow: (TARGET, CONFIG) => Boolean = (_, _) => true

  def filterSourceRow: (SOURCE, CONFIG) => Boolean = (_, _) => true
}
