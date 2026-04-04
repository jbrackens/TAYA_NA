package test.shared

import java.time.ZonedDateTime

import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto._

trait SBTechObjectSupport {

  def sampleUser: UserDetails = {
    UserDetails(123123, "someLogin", "someName", "GB")
  }

  def sampleBet: Bet = {
    Bet("someId", 0D, 999L, ZonedDateTime.now())
  }

  def sampleSelection: Selection = {
    Selection(123L, 78965L, "Winner", ZonedDateTime.now(), 200)
  }
}
