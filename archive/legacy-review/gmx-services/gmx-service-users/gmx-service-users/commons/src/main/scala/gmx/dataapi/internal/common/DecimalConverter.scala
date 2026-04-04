package gmx.dataapi.internal.common

//TODO extract to data-api commons | https://flipsports.atlassian.net/browse/GMV3-332
object DecimalConverter {
  def toDecimal(in: Double): BigDecimal =
    BigDecimal(in).setScale(4)

  def toDecimal(in: String): BigDecimal =
    BigDecimal(in)

  def toString(in: BigDecimal): String =
    in.toString()

}
