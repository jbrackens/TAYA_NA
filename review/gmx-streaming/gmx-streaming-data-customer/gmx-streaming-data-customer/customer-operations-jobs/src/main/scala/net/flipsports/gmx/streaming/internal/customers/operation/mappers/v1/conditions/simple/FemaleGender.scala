package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple


import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.Gender
import net.flipsports.gmx.streaming.internal.customers.operation.operation._

class FemaleGender extends Predicate[ValueType] {

  override def test(record: ValueType): Boolean = Gender.Female.genderMatch(record.getGender)

}

object FemaleGender extends Serializable {

  def apply(): FemaleGender = new FemaleGender()

}
