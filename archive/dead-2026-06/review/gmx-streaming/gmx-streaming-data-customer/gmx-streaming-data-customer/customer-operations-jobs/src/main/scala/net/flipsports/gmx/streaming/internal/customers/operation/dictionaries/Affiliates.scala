package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

import java.io.Serializable

case class Affiliates(code: Int) extends Serializable {
  override def toString: String = s"a_$code"

  def codeMatch(candidate: String): Boolean = candidate.startsWith(toString)

}

object Affiliates {

  private val codes = Seq(2360, 1999, 535, 1195, 825, 994, 2142, 274, 2035, 636,
    2206, 2141, 2327, 1256, 1166, 348, 705, 2143, 658, 1541, 2044)

  private val oddscheckerAffiliateTags = Seq(31)

  private val specialAffiliate = Seq(2410)

  def supportedFemaleAffiliatesCodes() = codes.map(Affiliates(_))

  def supportedNewSegmentAffiliatesCodes() = oddscheckerAffiliateTags.map(Affiliates(_))

  def specialAffiliatesCodes() = specialAffiliate.map(Affiliates(_))

}