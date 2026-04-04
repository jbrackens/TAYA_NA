package com.betconstruct.avro.enigma.details


case class ClientDetails(data: Map[String, Object]) extends MapBasedEvent(data) {

  def id: String = get("Id")

  def registrationSource: String = get("RegistrationSource")

  def name: String = get("Name")

  def currencyId: String = get("CurrencyId")

  def regionId: String = get("RegionId")

  def language: String = get("Language")

  def partnerId: String = get("PartnerId")

  def modified: String = get("Modified")
}
