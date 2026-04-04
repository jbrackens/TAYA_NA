package stella.common.http.crypt

import org.scalacheck.Arbitrary
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks

class SecretBoxUtilsSpec extends AnyFlatSpec with should.Matchers with ScalaCheckDrivenPropertyChecks {
  import SecretBoxUtilsSpec._

  "SecretBoxUtils" should "be able to encrypt and decrypt String" in {
    forAll(Arbitrary.arbString.arbitrary) { secret =>
      val encrypted = SecretBoxUtils.encrypt(secret, secretBoxHexKey) match {
        case Right(value) => value
        case Left(e)      => fail(s"Secret $secret should be properly encrypted but there was failure: $e")
      }
      encrypted should not be secret
      val decrypted = SecretBoxUtils.decrypt(encrypted, secretBoxHexKey) match {
        case Right(value) => value
        case Left(e) =>
          fail(s"Secret $secret encrypted as $encrypted should be properly decrypted but there was failure: $e")
      }
      decrypted shouldBe secret
    }
  }

  it should "properly decrypt String" in {
    SecretBoxUtils.decrypt(encryptedTestSecretBox, secretBoxHexKey) shouldBe Right(decryptedTestSecretBox)
  }
}

object SecretBoxUtilsSpec {
  private val secretBoxHexKey = "ea87def016584b3c84e5cdbea4dcc868ea87def016584b3c84e5cdbea4dcc868"

  private val encryptedTestSecretBox =
    "megs0X7eHgike-J13ayuSgOCT9PxxakFIt0LpnWishbo4KOJyqcizGplfl32PtFUHZaE3N7UbS9-NxFokmtERK" +
    "HGXJxILYc2-gEuJezV7FM2SVklc-r-pt9LpOGHNBgwjLk0RQgNwuZtcaTJ7Bg2aarLbcGimsAvxT8nh70o6ItJoYJK8969_2IXMUTWCU_OlAjHDe" +
    "jO1qqsZbgjELGpX-yhBUhNUo9dMAuWVE7rBg9SplYL0JJMI_pCs1N7iL9lZP5VopMOL-uBRJd0a19ppPze4r0ZdTCGD7tcO6W9PmTq2KWKdyBEhc" +
    "O6MhO_bUgyd8BLxDfIdFfgzM8WqT348chFyUrAkD6-lILfpL12Tyam5Kh26X6s4ftt0TZTjzl7mVwlCeCXe2FoFcXYchZOVfnEugedPjb4F93o8g" +
    "RLRiaqJT4uQ9E10iwlL-pWGEdPTBWT1IvVbTOpOVnnpO4VjyFQTj1vjJl0b9_pHJN2d85JYKgfHJfXIXaFXiy5jYgJi-_Zy64yjobgpbS9UBKu1B" +
    "_fJgMchiP1x7Mf5BFwVWFi68NrpDtkUacHSXLG0Wz6KS7ZUTFI4iLdgr3O867Xb4R4MMILGmy-xDZSBtz_RABZVeOV85h4-8nX9oEv9ECrlv91BJ" +
    "lDgSU_AC0K_vuSpTQ0u71rpe9F3Wj3IvKtSn5mEQ06H1m579BJCeLal8evNxVfzoVKQ_zYff0PnOSFfrulAleCs0icXd4p92SjmmE1HRpNnEup1a" +
    "dDT0fuxUNuKMM9S0OsoTdeAQqUxtT7LLoQDmM2V_SdlP-sZVg84QocXEGjiikUAY5F4uCrCWAywi9mugh1H6Smv9iiUqmSjFcIJ_kDbIEzv4tm8M" +
    "PZXc1h7-QMTgLPU0VFtBDIGFIncMqr-bCAXAMJjh6AVP6BLe2hGkkUY5dB5JNbYRKlGEONOZLHtjUeOH-_AEg5-3LDs1dVx85qgEqLqHFOW55tL0" +
    "UXd4VHO3POa9t4VxRXI1ypD4XFxPzY2Rk3q9IjTNttR9imcoRlBBhiVXpm8Jm6kisqrCLqIqZPVGymZ4Yg5Xc0Lbk_jK-LlRcv4hlDGWfd0KVyFL" +
    "RDQ4OZnOYP-R-2u2GMF91FrBvNDH19W91sMISMUMsaCW04vpdCydXQ4Yl7HsnLt-8t55b4HTMUqJYF33jLKb3W96G_MO6gB714NcjI88e7BvXWHZ" +
    "nVIVyADso3zRmf6h_gsa1fsZFf_PkUsqs9ldg7AfUAjjuARGflZ7m99BCoPBSnEgqL1FqS6W1CjOkkyRx1X0Cj9j0RQwoqRSuy9WEzdw9YHe9ENF" +
    "Qky5Wgd4qpg7zZf1fHw98_Ck9y-bcF33kAOTj5fbgVKJMJvz8FOtxpjKBBpL2Ut7sdWtBUKp_On4y1N0WVLEuAfvk6yER2mUiVeLyLTjDbSjZqdm" +
    "0o5gb92Ld2eq0RtqEOWGH8w50q2h6ZcvHkfSCP00IwGv2e14hOeoo62_pWNaiOgB1faBJhGqLAwg2QhmVIxQnaDpYhUe1ArV4S8uZYBRCOjXJGo1" +
    "5LJtnPpp39yC5_LAkzlgUPiq9kuT3hGnk3-_pi6Ezy64Lh9AeUTTgnqc5iqUUb-M7nHp65FOfiWhmugHGUS5nwTITPI6zafCfAXOOj9dlVtqwe4M" +
    "EZseqvrlzIdYB6s7vtcPEweOXGwY6d2tcA0MT4Ko5Q-NqA5y0zHldPsAfvzniJIjWVu63p1RPsiyYcOIehh8AkoHYNE8inOJJAqUJRtEdDyLRrf0" +
    "y7RJh2u4e9TFxLOtt1CS33LjY8c7Zq0gg8SxGWVyfHCDvxl0gbXu0Aok75sRkPO2EGBgVnB9P_DLR3tMZM5U7cIvDpH87GpM0VrLVm9ZmzTBXO-T" +
    "ZHXlweJLljBHDEw5_UI26e8YbJEHHG33jlplmh3YCKemTmqDQPlLeiW161DnVL36-XnXzTfCbbMZ_KJOnDSy4vQdhOiSdPofGquD3hzolUbGEKLC" +
    "lmdLpA_eIWfDbi1KXGTnukWaECDNtAl1C7ZiJ5TJFN4bfz-d16yVuBR0sfw3bLU79HgyRWpIfvMY7LZRQLvygnrHK_mAZVU5oahpFU5AiuevFeEy" +
    "1fzlGialcf8lhjus28yE3SaswDsnV8lR4yv7Ypjxn74h-7TDpuGfvNPhp2C7I1EF6P2Hgxt5j5sVKzx1dD1FcLq1W7OQ--wS8WT7iWTmmTnicTXF" +
    "9__W1LLgCgK17TyyJwOBtptmAxNtY6RIXB0vXc55Eciiq0mndYbXm87Ixi39JBuZiStKVpsltRlF72Qbyv3-o7aEPZvdT7XKpx0hXCRA813Ibkqg" +
    "XWKT9uWmeGrzo11tRZ2-vqMfwhG5dPVIzdM6SR1yYLzEYca2QOk_Hh06kdNKWspIoc-FxBxyoYeJsD2Eg3Q31ScbUgadVAIYJUvSec66tDeAyb7q" +
    "VRff9Sbb7c9DZHMOlyT3DMDQgtIylxD2aSMEN4ZTki_pHmG956RLNREFfJNdj6j7ttbw53LTB320WKmS1FAMJz49B00_6-51FHhmmscnJBOInUDt" +
    "tjQg8HyaZyaDvSzWxysBx8I_w8szmD9wDZ1oqyk2Mn-8Xut0b_1rdTzFrf3qA1davL-qhdLfJtPkR4AvWBCbH7ItkJY1yCTTDEnwOGam1uLVNlGq" +
    "AklFYcBjScMjRNLQw5EAaa_IJcD6qzIFJ_QKvLU5cSb4700FLanH5V3bOha2aFG0PX4kjqO7VGuXPTlEeJhS4i15HS1J06fuHTAzhcrK4GPojh7H" +
    "jzC9BFcXfcPr69qcF8j0qByxNiXRVLRymhwunTkwb1HIrlnagJbKs5WzylkwMbZ5ZkdQEZmjx8bQq2gcNbeFxU8dN3XiJKYzxwNeIrvLjzYZoI0z" +
    "xCR3lMmXpwqlRPLDQR8kNwUAm_qsbbR_aZUJfZ548uzRoVpi4eIDf3Fh-xHrViEJnNNLzpFb4jnMoSxaw9rNcRUC-difmZpUdXAb541FZGeg"

  private val decryptedTestSecretBox = """{"orig": "117ba0aa-fe0c-43b1-ab60-851391e96b44", "jpk": """ +
    """["oidc:address:read", "oidc:address:write", "oidc:admin:clear_oidc:write", "oidc:admin:company:read", """ +
    """"oidc:admin:external_user_mapping:write", "oidc:admin:openid:read", "oidc:admin:openid:write", """ +
    """"oidc:admin:profile:address:read", "oidc:admin:profile:address:write", "oidc:admin:profile:email:read", """ +
    """"oidc:admin:profile:email:write", "oidc:admin:profile:last_seen:write", "oidc:admin:profile:password:write",""" +
    """ "oidc:admin:profile:phone_number:read", "oidc:admin:profile:phone_number:write", "oidc:admin:profile:read",""" +
    """ "oidc:admin:profile:social_account:read", "oidc:admin:profile:social_account:write", """ +
    """"oidc:admin:profile:write", "oidc:email:read", "oidc:email:write", "oidc:password:write", """ +
    """"oidc:phone_number:read", "oidc:phone_number:write", "oidc:profile:read", "oidc:profile:write", """ +
    """"oidc:register:write", "oidc:social:token:read", "payment_gateway:admin:china_mobile:read", """ +
    """"payment_gateway:admin:china_mobile:write", "user_context:admin:context:read", """ +
    """"user_context:admin:context:write", "virtual_store:admin:antstream:configuration:read", """ +
    """"virtual_store:admin:antstream:configuration:write", "virtual_store:admin:any:backpack:activate", """ +
    """"virtual_store:admin:any:backpack:read", "virtual_store:admin:any:backpack:write", """ +
    """"virtual_store:admin:any:order:backpack:create", "virtual_store:admin:any:order:deliver", """ +
    """"virtual_store:admin:any:order:log:write", "virtual_store:admin:any:order:read", """ +
    """"virtual_store:admin:any:order:write", "virtual_store:admin:any:subscription:deactivate", """ +
    """"virtual_store:admin:any:subscription:read", "virtual_store:admin:any:subscription:write", """ +
    """"virtual_store:admin:order:read", "virtual_store:admin:order:write", "virtual_store:admin:product:read", """ +
    """"virtual_store:admin:product:write", "virtual_store:admin:subscription:read", """ +
    """"virtual_store:admin:subscription:write", "virtual_store:antstream:configuration:read", """ +
    """"virtual_store:antstream:configuration:write", "virtual_store:order:read", "virtual_store:order:write", """ +
    """"virtual_store:product:read", "virtual_store:product:write", "virtual_store:subscription:read", """ +
    """"virtual_store:subscription:write"], "ops": "117ba0aa-fe0c-43b1-ab60-851391e96b44", "ist": false}"""
}
