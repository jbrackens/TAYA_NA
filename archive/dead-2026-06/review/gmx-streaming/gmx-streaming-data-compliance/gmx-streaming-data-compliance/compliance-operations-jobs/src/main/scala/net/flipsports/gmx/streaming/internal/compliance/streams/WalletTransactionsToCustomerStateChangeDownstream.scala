package net.flipsports.gmx.streaming.internal.compliance.streams

import net.flipsports.gmx.streaming.common.functions.KeyedDownstream
import net.flipsports.gmx.streaming.internal.compliance.Types.{WalletTransactions, Compliance}

trait WalletTransactionsToCustomerStateChangeDownstream extends KeyedDownstream[WalletTransactions.KeyType, WalletTransactions.ValueType, Compliance.KeyType, Compliance.ValueType] {


}