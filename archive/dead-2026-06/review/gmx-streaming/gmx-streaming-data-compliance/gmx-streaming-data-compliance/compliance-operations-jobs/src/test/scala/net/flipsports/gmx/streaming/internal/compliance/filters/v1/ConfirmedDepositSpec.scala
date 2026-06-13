package net.flipsports.gmx.streaming.internal.compliance.filters.v1

import net.flipsports.gmx.streaming.internal.compliance.data.v1.WalletTransactionDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class ConfirmedDepositSpec extends StreamingTestBase  {

  val filter = ConfirmedDeposit()

  "match for ireland user" in {
    // given
    val source = WalletTransactionDataProvider.all.filter(_.f0.getCustomerID == WalletTransactionDataProvider.correctTransactionCustomerId).head

    // when
    filter.filter(source) shouldEqual true
    filter.filter(WalletTransactionDataProvider.single) shouldEqual false
  }
}
