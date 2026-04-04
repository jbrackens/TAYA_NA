package com.betconstruct.avro.enigma.details

case class  ClientDetailsInLogin(value: Map[String, Object]) extends MapBasedEvent(value) {

  /**
   * CLientId
    */
  def Id: Integer = get("Id")

  def RegistrationSource: Integer = get("RegistrationSource")

  def PartnerId: Integer = get("PartnerId")

  /**
   * Client_Name
   */
  def Name: String = get("Name")

  def CurrencyId: String = get("CurrencyId")

  def RegionId: Integer = get("RegionId")

  def Language: String = get("Language")

  def ActivationState: Integer = get("ActivationState")

  def Address: String = get("Address")

  def BTag: String = get("BTag")

  def BankName: String = get("BankName")

  def BirthCity: String = get("BirthCity")

  def BirthDate: Long = getLong("BirthDate")

  def BirthDepartment: String = get("BirthDepartment")

  def BirthRegionCode2: String = get("BirthRegionCode2")

  def BirthRegionId: Integer = get("BirthRegionId")

  def City: String = get("City")

  def ClientVerificationDate: Long = getLong("ClientVerificationDate")

  def CountryName: String = get("CountryName")

  def CreditLimit: String = get("CreditLimit")

  def DocIssueCode: String = get("DocIssueCode")

  def DocIssueDate: Long = getLong("DocIssueDate")

  def DocIssuedBy: String = get("DocIssuedBy")

  def DocNumber: String = get("DocNumber")

  def Email: String = get("Email")

  def Gender: Integer = get("Gender")

  def IBAN: String = get("IBAN")

  def IsCasinoBlocked: Boolean = get("IsCasinoBlocked")

  def IsLocked: Boolean = get("IsLocked")

  def IsRMTBlocked: Boolean = get("IsRMTBlocked")

  def IsResident: Boolean = get("IsResident")

  def IsSubscribeToEmail: Boolean = get("IsSubscribeToEmail")

  def IsSubscribeToInternalMessage: Boolean = get("IsSubscribeToInternalMessage")

  def IsSubscribeToPhoneCall: Boolean = get("IsSubscribeToPhoneCall")

  def IsSubscribeToPushNotification: Boolean = get("IsSubscribeToPushNotification")

  def IsSubscribeToSMS: Boolean = get("IsSubscribeToSMS")

  def IsSubscribedToNewsletter: Boolean = get("IsSubscribedToNewsletter")

  def IsTest: Boolean = get("IsTest")

  def IsVerified: Boolean = get("IsVerified")

  def MobilePhone: String = get("MobilePhone")

  def NickName: String = get("NickName")

  def IsUsingCredit: Boolean = get("IsUsingCredit")

  def PromoCode: String = get("PromoCode")

  def Province: String = get("Province")

  def Status: Integer = get("Status")

  def SwiftCode: String = get("SwiftCode")

  def TCVersionAcceptanceDate: Long = getLong("TCVersionAcceptanceDate")

  def TCVersionAcceptanceLocalDate: Long = getLong("TCVersionAcceptanceLocalDate")

  def TermsAndConditionsVersion: String = get("TermsAndConditionsVersion")

  def Title: String = get("Title")

  def ZipCode: String = get("ZipCode")
}
