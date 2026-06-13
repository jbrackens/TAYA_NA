package net.flipsports.gmx.streaming.common.job

import net.flipsports.gmx.streaming.common.business.Brand

trait BusinessMetaParameters extends Serializable {

  def brand(): Brand

}

trait DefaultMetaParameters extends BusinessMetaParameters {

  def brand(): Brand = Brand.default

}

trait SportNationMetaParameters extends BusinessMetaParameters {

  def brand(): Brand = Brand.sportNations

}

trait RedZoneMetaParameters extends BusinessMetaParameters {

  def brand(): Brand = Brand.redZone

}

trait FansbetUkMetaParameters extends BusinessMetaParameters {

  def brand(): Brand = Brand.fansbetUk
}

trait IdefixMetaParameters extends BusinessMetaParameters {

  def brand(): Brand = Brand.idefix
}

trait BetConstructMetaParameters extends BusinessMetaParameters {

  def brand(): Brand = Brand.betConstruct
}

trait WaysunMetaParameters extends BusinessMetaParameters {

  def brand(): Brand = Brand.waysun
}


object BusinessMetaParameters {

  val sportNation = new SportNationMetaParameters {}

  val redZone = new RedZoneMetaParameters {}

  val fansbetUk = new FansbetUkMetaParameters {}

  val idefix = new IdefixMetaParameters {}

  val betConstruct = new BetConstructMetaParameters {}

  val waysun = new WaysunMetaParameters {}
}
