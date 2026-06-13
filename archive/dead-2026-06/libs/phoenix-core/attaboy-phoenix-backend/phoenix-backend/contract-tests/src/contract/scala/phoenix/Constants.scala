package phoenix

object Constants {

  object Websockets {
    val SubscribeSuccess = "subscribe:success"
    val BetsChannel = "bets"
    val StateField = "state"
    val UpdateKey = "update"
  }

  object Bets {
    val Opened = "OPENED"
  }

  object Markets {
    val Bettable = "BETTABLE"
  }

  object Currency {
    val USD = "USD"
  }

  object Http {
    val GeoHeader = "dummy_value_for_now"
  }

  object Payments {
    val Provider = "ContractTests"
    val CreditCardDeposit = "CreditCardDeposit"
    val CreditCardWithdrawal = "CreditCardWithdrawal"
  }
}
