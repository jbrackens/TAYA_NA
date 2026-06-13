package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

import ca.mrvisser.sealerate
abstract sealed class Segment(val segmentLevel: SegmentLevel,val segmentAttributes: SegmentAttributes) {

  def segmentMatches(candidate: Segment): Boolean = segmentLevel == candidate.segmentLevel

  def attributesMatches(customerGender: Gender, customerRegistrationProduct: RegistrationProduct, customerDevice: Option[OSVersion]): Boolean =
    segmentAttributes.attributesMatch(customerGender, customerRegistrationProduct, customerDevice)

}

object Segment {

  case object Default extends Segment(
    segmentLevel = SegmentLevel.Default,
    segmentAttributes = SegmentAttributes(
      gender = Gender.Unknown,
      registrationProduct = RegistrationProduct.Default
    )
  )

  case object One extends Segment(
    segmentLevel = SegmentLevel.One,
    segmentAttributes = SegmentAttributes(
      gender = Gender.Male,
      registrationProduct = RegistrationProduct.Mobile))

  case object Two extends Segment(
    segmentLevel = SegmentLevel.Two,
    segmentAttributes = SegmentAttributes(
      gender = Gender.Male,
      registrationProduct = RegistrationProduct.MobileCasino))

  case object Three extends Segment(
    segmentLevel = SegmentLevel.Three,
    segmentAttributes = SegmentAttributes(
      gender = Gender.Female,
      registrationProduct = RegistrationProduct.MobileCasino))

  case object Four extends Segment(
    segmentLevel = SegmentLevel.Four,
    segmentAttributes = SegmentAttributes(
      gender = Gender.Male,
      registrationProduct = RegistrationProduct.Mobile,
      osVersions = Some(OSVersion.iOSPack))
  )

  case object Five extends Segment(
    segmentLevel = SegmentLevel.Five,
    segmentAttributes = SegmentAttributes(
      gender = Gender.Male,
      registrationProduct = RegistrationProduct.MobileCasino,
      osVersions = Some(OSVersion.iOSPack))
  )


  case object Six extends Segment(
    segmentLevel = SegmentLevel.Six,
    segmentAttributes = SegmentAttributes(
      gender = Gender.Male,
      registrationProduct = RegistrationProduct.Mobile,
      osVersions = Some(OSVersion.androidPack)
    )
  )

  case object Seven extends Segment(
    segmentLevel = SegmentLevel.Seven,
    segmentAttributes = SegmentAttributes(
      gender = Gender.Male,
      registrationProduct = RegistrationProduct.MobileCasino,
      osVersions = Some(OSVersion.androidPack)
    )
  )

  val values: Seq[Segment] = sealerate.values[Segment].toSeq

  def matchedSegments(customerGender: Gender, customerRegistrationProduct: RegistrationProduct, customerDevice: Option[OSVersion]): Seq[Segment] =
    values.filter(_.attributesMatches(customerGender, customerRegistrationProduct, customerDevice))

  def subsegments(segment: Segment): Seq[Segment] = segment match {
    case One => Seq(Four, Six)
    case Two => Seq(Five, Seven)
    case _ => Seq()
  }
}