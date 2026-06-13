package net.flipsports.gmx.streaming.common.business

case class SourceBrand(id: Int, uuid: String, name: String)

private object SourceBrand {

  val sportNationDef = "sportnation"

  val redZoneDef = "redzone"

  val fansbetUkDef = "fansbetuk"

  val betConstructDef = "betconstruct"

  val idefixDef = "edifix"

  val waysunDef = "waysun"

  val defaultDef = "default"

  val sportNation = SourceBrand(154, "9577609b-d14f-4f14-ae6d-a6de017e8254", sportNationDef)

  val redzone = SourceBrand(155, "7b4b7e86-d9df-44e0-9170-dbfdd5a176fa", redZoneDef)

  //TODO: GM-1451
  val fansbetUk = SourceBrand(389, "657f7ccc-b6bb-11ea-b3de-0242ac130004", fansbetUkDef)

  val betConstruct = SourceBrand(1001, "3ad7e294-c93e-4ffe-91a5-50b380982a73", betConstructDef)

  val idefix = SourceBrand(1002, "3ad7e294-c93e-4ffe-91a5-50b380982a73", idefixDef)

  val waysun = SourceBrand(1003, "a6defe9f-1290-48c0-8961-ea2cc4c2b09f", waysunDef)

  val default = SourceBrand(0, "f30c20c0-d119-11ec-9d64-0242ac120002", defaultDef)
}
