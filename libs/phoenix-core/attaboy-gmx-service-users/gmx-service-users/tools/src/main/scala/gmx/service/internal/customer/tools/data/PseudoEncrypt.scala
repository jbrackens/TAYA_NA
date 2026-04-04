package gmx.service.internal.customer.tools.data

import pl.szczepanik.silencio.api.Converter
import pl.szczepanik.silencio.core.{ Key, Value }

import scala.math.BigInt.long2bigInt

/**
 * Port of: https://wiki.postgresql.org/wiki/Pseudo_encrypt
 */
class PseudoEncrypt extends Converter {

  override def convert(
      key: Key,
      value: Value
    ): Value = {
    val longValue = value.getValue.toString.toLong
    val encoded   = pseudoEncode(longValue)
    new Value(encoded)
  }

  // FIXME add tests and adjust results to those from postgres counterpart | https://flipsports.atlassian.net/browse/GMV3-333
  def pseudoEncode(in: Long): Long = {
    var l1: BigInt = (in >> 16) & 65535
    var r1: BigInt = in & 65535

    var l2: BigInt = 0
    var r2: BigInt = 0

    (0 to 2).foreach { _ =>
      l2 = r1
      r2 = l1 ^ ((((1366 * r1 + 150889) % 714025).toDouble / 714025.0) * 32767).toInt
      l1 = l2
      r1 = r2
    }

    ((r1 << 16) + l1).toLong
  }

  override def init(): Unit = {
    // This method is intentionally empty, because this class is stateless
  }
}
