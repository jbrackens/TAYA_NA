package net.flipsports.gmx.streaming.sbtech.dto


sealed abstract class Kind(val name: String)

object Kind {

  case object Event extends Kind("event")

  case object Selection extends Kind("selection")

  case object Markets extends Kind("markets")

}