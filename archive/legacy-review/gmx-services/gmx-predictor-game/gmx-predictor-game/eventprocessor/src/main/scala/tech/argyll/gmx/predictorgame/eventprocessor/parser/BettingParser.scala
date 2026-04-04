package tech.argyll.gmx.predictorgame.eventprocessor.parser

import java.io.InputStream
import java.util

import net.press.pa.delivery.betting.{HorseRacing, Meeting}
import tech.argyll.gmx.datacollector.padatafeed.model.ParserBase

class BettingParser extends ParserBase[HorseRacing](classOf[HorseRacing]) {

  def parse(input: InputStream): util.List[Meeting] = parse(input, classOf[Meeting])
}
