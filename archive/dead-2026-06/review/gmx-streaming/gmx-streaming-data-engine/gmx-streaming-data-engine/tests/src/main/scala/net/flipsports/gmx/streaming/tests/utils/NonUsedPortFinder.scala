package net.flipsports.gmx.streaming.tests.utils

import java.net.ServerSocket

import scala.annotation.tailrec

trait NonUsedPortFinder {

  def obtainNonTakenPort: Int = tryUntil(5)

  @tailrec
  private def tryUntil(times: Int): Int = {
    if (times < 0) {
      throw new RuntimeException("free port not found")
    }
    try {
      val serverSocket = new ServerSocket(0)
      serverSocket.close()
      serverSocket.getLocalPort
    } catch {
      case t: Throwable => tryUntil(times - 1)
    }
  }

}
