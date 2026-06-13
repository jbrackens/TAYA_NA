package net.flipsports.gmx.streaming.sbtech.streams

import java.time.{ZoneId, ZonedDateTime}

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.KafkaWithFlink
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.common.job.MetaParameters
import net.flipsports.gmx.streaming.data.v1.{CasinoBetDataProvider, SettlementDataProvider}
import net.flipsports.gmx.streaming.sbtech.Types
import net.flipsports.gmx.streaming.sbtech.streams.downstreams.TopUpCalculationDownstream

class MarketingCampaignsRewardsDataStreamSpec extends KafkaWithFlink {

  "Marketing campaigns" must {

    "add topup points" in {
      withEnvironment { (config, kafkaProperties, schemaRegistryUrl) =>
        val messages = SettlementDataProvider("points-earnings-and-exemptions/trebbles-possitive.json").allAsTuple

        val job = new MarketingCampaignsRewardsDataStream(
          metaParameters = MetaParameters("", Some(checkpoints)),
          businessMetaParameters = brandMetaParameters,
          configuration = config
        ) {
          override def topupCaluationDownstream(): TopUpCalculationDownstream = getTopUpCalculationDownstream(brandMetaParameters.brand())
        }

        import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementDataCustomerId
        import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementData

        withSource[Types.SportBets.KeyType, Types.SportBets.ValueType](messages, schemaRegistryUrl, job.sportBetsSourceTopic, kafkaProperties, SettlementDataCustomerId.SCHEMA$, SettlementData.SCHEMA$)


        runAsyncJob(job.stream())

        val result = getResult(kafkaProperties, job.targetTopic, schemaRegistryUrl, CasinoAndSportBetsTopupData.SCHEMA$)

        result.size shouldBe (1)


      }
    }

    "not add topup points with on bet odds under limit" in {
      withEnvironment { (config, kafkaProperties, schemaRegistryUrl) =>
        val messages = SettlementDataProvider("points-earnings-and-exemptions/trebbles-negattives.json").allAsTuple

        val job = new MarketingCampaignsRewardsDataStream(
          metaParameters = MetaParameters("", Some(checkpoints)),
          businessMetaParameters = brandMetaParameters,
          configuration = config
        ) {
          override def topupCaluationDownstream(): TopUpCalculationDownstream = getTopUpCalculationDownstream(brandMetaParameters.brand())
        }

        import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementDataCustomerId
        import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementData

        withSource[Types.SportBets.KeyType, Types.SportBets.ValueType](messages, schemaRegistryUrl, job.sportBetsSourceTopic, kafkaProperties, SettlementDataCustomerId.SCHEMA$, SettlementData.SCHEMA$)


        runAsyncJob(job.stream())

        val result = getResult(kafkaProperties, job.targetTopic, schemaRegistryUrl, CasinoAndSportBetsTopupData.SCHEMA$)

        result.size shouldBe (0)


      }
    }

    "not add topup points with on cashout" in {
      withEnvironment { (config, kafkaProperties, schemaRegistryUrl) =>
        val messages = SettlementDataProvider("points-earnings-and-exemptions/trebbles-cashed-out.json").allAsTuple

        val job = new MarketingCampaignsRewardsDataStream(
          metaParameters = MetaParameters("", Some(checkpoints)),
          businessMetaParameters = brandMetaParameters,
          configuration = config
        ) {
          override def topupCaluationDownstream(): TopUpCalculationDownstream = getTopUpCalculationDownstream(brandMetaParameters.brand())
        }

        import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementDataCustomerId
        import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementData

        withSource[Types.SportBets.KeyType, Types.SportBets.ValueType](messages, schemaRegistryUrl, job.sportBetsSourceTopic, kafkaProperties, SettlementDataCustomerId.SCHEMA$, SettlementData.SCHEMA$)


        runAsyncJob(job.stream())

        val result = getResult(kafkaProperties, job.targetTopic, schemaRegistryUrl, CasinoAndSportBetsTopupData.SCHEMA$)

        result.size shouldBe (0)


      }
    }

    "add casino bet topup" in {
      withEnvironment { (config, kafkaProperties, schemaRegistryUrl) =>
        val messages = CasinoBetDataProvider("points-earnings-and-exemptions/casino-bet.json").allAsTuple

        val job = new MarketingCampaignsRewardsDataStream(
          metaParameters = MetaParameters("", Some(checkpoints)),
          businessMetaParameters = brandMetaParameters,
          configuration = config
        ) {
          override def topupCaluationDownstream(): TopUpCalculationDownstream = getTopUpCalculationDownstream(brandMetaParameters.brand())
        }

        withSource[Types.CasinoBets.KeyType, Types.CasinoBets.ValueType](messages, schemaRegistryUrl, job.casinoBetsSourceTopic, kafkaProperties, CasinoBetCustomerId.SCHEMA$, CasinoBet.SCHEMA$)


        runAsyncJob(job.stream())

        val result = getResult(kafkaProperties, job.targetTopic, schemaRegistryUrl, CasinoAndSportBetsTopupData.SCHEMA$)
        // casino is reduced now.
        result.size shouldBe (0)


      }
    }


    "add casino bet topup on problem case 1" in {
      withEnvironment { (config, kafkaProperties, schemaRegistryUrl) =>
        val messages = SettlementDataProvider("points-earnings-and-exemptions/problem1.json").allAsTuple

        val job = new MarketingCampaignsRewardsDataStream(
          metaParameters = MetaParameters("", Some(checkpoints)),
          businessMetaParameters = brandMetaParameters,
          configuration = config
        ) {
          override def topupCaluationDownstream(): TopUpCalculationDownstream = getTopUpCalculationDownstream(brandMetaParameters.brand())
        }
        import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementDataCustomerId
        import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementData

        withSource[Types.SportBets.KeyType, Types.SportBets.ValueType](messages, schemaRegistryUrl, job.sportBetsSourceTopic, kafkaProperties, SettlementDataCustomerId.SCHEMA$, SettlementData.SCHEMA$)


        runAsyncJob(job.stream())

        val result = getResult(kafkaProperties, job.targetTopic, schemaRegistryUrl, CasinoAndSportBetsTopupData.SCHEMA$)

        result.size shouldBe (1)


      }
    }

    "add single sport bet with 0 amount" in {
      withEnvironment { (config, kafkaProperties, schemaRegistryUrl) =>
        val messages = SettlementDataProvider("points-earnings-and-exemptions/problem2.json").allAsTuple

        val job = new MarketingCampaignsRewardsDataStream(
          metaParameters = MetaParameters("", Some(checkpoints)),
          businessMetaParameters = brandMetaParameters,
          configuration = config
        ) {
          override def topupCaluationDownstream(): TopUpCalculationDownstream = getTopUpCalculationDownstream(brandMetaParameters.brand())
        }
        import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementDataCustomerId
        import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementData

        withSource[Types.SportBets.KeyType, Types.SportBets.ValueType](messages, schemaRegistryUrl, job.sportBetsSourceTopic, kafkaProperties, SettlementDataCustomerId.SCHEMA$, SettlementData.SCHEMA$)


        runAsyncJob(job.stream())

        val result = getResult(kafkaProperties, job.targetTopic, schemaRegistryUrl, CasinoAndSportBetsTopupData.SCHEMA$)

        result.size shouldBe (0)
      }

    }
  }

  def getTopUpCalculationDownstream(brand: Brand) = new TopUpCalculationDownstream(brand) {
    override val beginningPeriod: ZonedDateTime = ZonedDateTime.of(2000, 12, 1, 0, 0, 0, 0, ZoneId.systemDefault())

    override val endPeriod: ZonedDateTime = ZonedDateTime.of(3000, 12, 1, 0, 0, 0, 0, ZoneId.systemDefault())
  }
}
