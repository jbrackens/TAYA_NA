package net.flipsports.gmx.streaming.internal.customers.operation.udf.dto

case class ValueInDate(value: String, date: Long)

case class ValuesInDate(tagsInDate: Seq[ValueInDate] = Seq()) {
  def withoutRetained(retention: Long): ValuesInDate = {
    copy(
      tagsInDate = tagsInDate.filter(_.date > retention)
    )
  }

  def withValue(actionWithValue: String, inDate: Long): ValuesInDate = {
    copy(
      tagsInDate = tagsInDate :+ ValueInDate(actionWithValue, inDate)
    )
  }


  def containsValue(actionWithValue: String): Boolean = !tagsInDate.filter(_.value.equalsIgnoreCase(actionWithValue)).isEmpty

}