package com.betconstruct.avro.enigma.details

case class Selection(value: Map[String, Object]) extends MapBasedEvent(value) {

  def Id: Long = getLong("Id")

  def Stake: Double = get("Stake")

  def SportId: Long = getLong("SportId")

  def SportName: String = get("SportName")

  def State: Long = getLong("State")

  def Winning: Double = get("Winning")

  def Price: Double = get("Price")

  def Handicap: Double = get("Handicap")

  def MarketId: Long = getLong("MarketId")

  def MarketName: String = get("MarketName")

  def Name: String = get("Name")

  def CompetitionId: Long = getLong("CompetitionId")

  def CompetitionName: String = get("CompetitionName")

  def MatchId: Long = getLong("MatchId")

  def MatchName: String = get("MatchName")

  def MatchStartTime: Long = getLong("MatchStartTime")

}