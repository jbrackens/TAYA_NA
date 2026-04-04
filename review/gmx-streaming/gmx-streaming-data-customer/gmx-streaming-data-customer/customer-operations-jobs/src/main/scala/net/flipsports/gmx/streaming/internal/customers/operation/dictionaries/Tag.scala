package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

import ca.mrvisser.sealerate

sealed abstract class Tag(val name: String) extends Serializable {

  override def toString: String = name

}

object Tag {

  case object CustomerServiceManual extends Tag("CSManual")

  case object Canada extends Tag("CANADA_REG")

  case object CustomerVerified extends Tag("sVerified")

  case object FemaleCustomerBlocked extends Tag("sBlocked")

  case object KycVerificationTrigger extends Tag("KYC_TRIGGERED_17")

  case object MaleMobileSports extends Tag("M_Mobile_Sports")

  case object MaleIphoneSports extends Tag("M_Iphone_Mobile_Sports")

  case object MaleMobileCasino extends Tag("M_Mobile_Casino")

  case object MaleIphoneMobileSports extends Tag("M_Iphone_MobileSports")

  case object MaleIphoneMobileCasino extends Tag("M_Iphone_MobileCasino")

  case object MaleAndroidMobileCasino extends Tag("M_Android_MobileCasino")

  case object MaleAndroidMobileSports extends Tag("M_Android_MobileSports")

  case object HighValue extends Tag("HighValue")

  case object FemaleMobileCasino extends Tag("F_Mobile_Casino")

  case object CustomerUndecided extends Tag("UNDECIDED")

  case object NewSegment extends Tag("M_V_REQ")

  case object Black extends Tag("BLACK")

  case object Red extends Tag("RED")

  case object Grey extends Tag("GREY")

  case object Bronze extends Tag("BRONZE")

  case object Silver extends Tag("SILVER")

  case object Gold extends Tag("GOLD")

  case object Default extends Tag("")

  def values: Set[Tag] = sealerate.values[Tag]

}
