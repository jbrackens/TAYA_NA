package net.flipsports.gmx.streaming.common.kafka

package object consumerschema {

  def withPositiveTimestamp[R](timestamp: Long)(f: (Long) => R): R = {
      if (timestamp > 0) {
        f(timestamp)
      } else {
        f(System.currentTimeMillis())
      }
    }



}
