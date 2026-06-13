package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple
import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.Affiliates
import net.flipsports.gmx.streaming.internal.customers.operation.operation._

class AffiliatesEquals(val affiliates: Seq[Affiliates]) extends Predicate[ValueType] {

  override def test(customer: ValueType): Boolean =
    affiliates.exists(_.codeMatch(customer.getAffiliateTag))
}

object AffiliatesEquals {

  def femalePreferredAffiliates() = new AffiliatesEquals(Affiliates.supportedFemaleAffiliatesCodes())

  def newSegmentAffiliates() = new AffiliatesEquals(Affiliates.supportedNewSegmentAffiliatesCodes())

  def specialAffiliates() = new AffiliatesEquals(Affiliates.specialAffiliatesCodes())

}