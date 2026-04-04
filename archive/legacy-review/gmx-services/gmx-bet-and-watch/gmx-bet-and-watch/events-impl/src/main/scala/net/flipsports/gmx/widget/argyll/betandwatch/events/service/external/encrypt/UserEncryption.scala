package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.encrypt

import org.apache.commons.codec.digest.{HmacAlgorithms, HmacUtils}

class UserEncryption(config: EncryptionConfig) {

  private val hmac = new HmacUtils(HmacAlgorithms.HMAC_SHA_1, config.userSeed)

  def hashUserID(partner: String, userId: String): String =
    hmac.hmacHex(s"${partner}_$userId")

}
