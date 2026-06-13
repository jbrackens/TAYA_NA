package net.flipsports.gmx.streaming.sbtech.configs

case class Features(
  customerDetails: Boolean = false,
  casinoBets: Boolean = false,
  sportBets: Boolean = false,
  walletTransactions: Boolean = false,
  logins: Boolean = false,
  odds: Boolean = false,
  offerEvents: Boolean = false,
  offerOptions: Boolean = false
)