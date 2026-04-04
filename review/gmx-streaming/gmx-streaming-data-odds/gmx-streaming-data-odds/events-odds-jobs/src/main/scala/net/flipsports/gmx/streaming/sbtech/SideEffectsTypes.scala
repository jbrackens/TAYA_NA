package net.flipsports.gmx.streaming.sbtech

import net.flipsports.gmx.streaming.sbtech.dto.Odds

object SideEffectsTypes {

  object Events {
    type Source = Odds
  }

  object Markets {
    type Source = Odds
  }

  object Selections {
    type Source = Odds
  }


}
