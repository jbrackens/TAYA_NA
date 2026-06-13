package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

import ca.mrvisser.sealerate

sealed abstract class SegmentWithTag(val segment: Segment, val tag: Tag) {

  def segmentMatch(candidate: Segment) = segment == candidate
}


object SegmentWithTag {

  case object Default extends SegmentWithTag(Segment.Default, Tag.Default)

  case object One extends SegmentWithTag(Segment.One, Tag.MaleMobileSports)

  case object Two extends SegmentWithTag(Segment.Two, Tag.MaleMobileCasino)

  case object Three extends SegmentWithTag(Segment.Three, Tag.FemaleMobileCasino)

  case object Four extends SegmentWithTag(Segment.Four, Tag.MaleIphoneMobileSports)

  case object Five extends SegmentWithTag(Segment.Five, Tag.MaleIphoneMobileCasino)

  case object Six extends SegmentWithTag(Segment.Six, Tag.MaleAndroidMobileSports)

  case object Seven extends SegmentWithTag(Segment.Seven, Tag.MaleAndroidMobileCasino)

  val values: Seq[SegmentWithTag] = sealerate.values[SegmentWithTag].toSeq

  def apply(segment: Segment): SegmentWithTag = values.find(_.segmentMatch(segment)).getOrElse(Default)


}
