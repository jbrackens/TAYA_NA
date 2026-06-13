package net.flipsports.gmx.streaming.common.job

object PathUtils {

  def localFileSystem(path: String) = s"file://$path/"
}
