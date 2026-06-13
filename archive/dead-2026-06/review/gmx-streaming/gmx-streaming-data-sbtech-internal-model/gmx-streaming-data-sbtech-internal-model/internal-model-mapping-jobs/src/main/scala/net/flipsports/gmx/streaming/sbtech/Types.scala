package net.flipsports.gmx.streaming.sbtech


object Types {

  object CasinoBet {
    import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
    type SourceKey = java.lang.Long
    type SourceValue = CasinoBet

    type TargetKey = CasinoBetCustomerId
    type TargetValue = CasinoBet
  }

  object CustomerDetail {
    import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.{CustomerDetail, CustomerDetailCustomerId}
    type SourceKey = java.lang.Integer
    type SourceValue = CustomerDetail

    type TargetKey = CustomerDetailCustomerId
    type TargetValue = CustomerDetail
  }

  object SettlementData {
    import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
    type SourceKey = java.lang.Long
    type SourceValue = SettlementData

    type TargetKey = SettlementDataCustomerId
    type TargetValue = SettlementData
  }

  object Logins {
    import SBTech.Microservices.DataStreaming.DTO.Login.v1.{Login, LoginCustomerId}
    type SourceKey = java.lang.Integer
    type SourceValue = Login

    type TargetKey = LoginCustomerId
    type TargetValue = Login
  }

  object WalletTransaction {
    import SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1.{WalletTransaction, WalletTransactionCustomerId}
    type SourceKey = java.lang.Long
    type SourceValue = WalletTransaction

    type TargetKey = WalletTransactionCustomerId
    type TargetValue = WalletTransaction
  }

  object OperatorEvents {
    import sbtech.sportsData.contracts.avro.{event, eventId}
    type SourceKey = java.lang.String
    type SourceValue = event

    type TargetKey = eventId
    type TargetValue = event
  }

  object OperatorMarkets {
    import sbtech.sportsData.contracts.avro.{market, marketId}
    type SourceKey = java.lang.String
    type SourceValue = market

    type TargetKey = marketId
    type TargetValue = market

  }

  object OperatorSelections {
    import sbtech.sportsData.contracts.avro.{selection, selectionId}
    type SourceKey = java.lang.String
    type SourceValue = selection

    type TargetKey = selectionId
    type TargetValue = selection
  }


  object OfferEvents {
    import SBTech.Microservices.DataStreaming.DTO.EventsInfo.v1.{EventInfo, EventInfoId}
    type SourceKey = java.lang.Integer
    type SourceValue = EventInfo

    type TargetKey = EventInfoId
    type TargetValue = EventInfo
  }

  object OfferOptions {
    import SBTech.Microservices.DataStreaming.DTO.LineInfo.v1.{LineInfo, LineInfoId}
    type SourceKey = java.lang.Integer
    type SourceValue = LineInfo

    type TargetKey = LineInfoId
    type TargetValue = LineInfo
  }
}