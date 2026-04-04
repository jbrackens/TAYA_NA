package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

import ca.mrvisser.sealerate

sealed abstract class SegmentLevel(val name: String,val tag: Tag) {

  override def toString: String = s"$name $tag"

  def levelNameMatch(segmentName: String): Boolean = name.equalsIgnoreCase(segmentName)

  def levelMatch(segmentName: SegmentLevel): Boolean = levelNameMatch(segmentName.name)
}


object SegmentLevel {

  case object One extends SegmentLevel("1", Tag.MaleMobileSports)

  case object Two extends SegmentLevel("2", Tag.MaleMobileCasino)

  case object Three extends SegmentLevel("3", Tag.FemaleMobileCasino)

  case object Four extends SegmentLevel("4", Tag.MaleIphoneMobileSports)

  case object Five extends SegmentLevel("5", Tag.MaleIphoneMobileCasino)

  case object Six extends SegmentLevel("6", Tag.MaleAndroidMobileSports)

  case object Seven extends SegmentLevel("7", Tag.MaleAndroidMobileCasino)

  case object Default extends SegmentLevel("-1", Tag.Default)

  def values: Set[SegmentLevel] = sealerate.values[SegmentLevel]

  def apply(code: String): SegmentLevel = values.find(_.levelNameMatch(code)).getOrElse(Default)


}