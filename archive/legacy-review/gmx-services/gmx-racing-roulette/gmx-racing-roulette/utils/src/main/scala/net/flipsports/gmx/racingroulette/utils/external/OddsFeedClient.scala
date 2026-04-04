package net.flipsports.gmx.racingroulette.utils.external

import com.softwaremill.sttp.{MediaTypes, SttpBackend, sttp, _}
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.Json

import scala.concurrent.{ExecutionContext, Future}

trait OddsFeedClient extends LazyLogging {

  implicit def backend: SttpBackend[Future, Nothing]

  implicit def ex: ExecutionContext

  def getMarkets = {
    sttp
      .post(uri"https://oddsfeed-sportnation.sbtech.com/markets")
      .contentType(MediaTypes.Json)
      .body(
        """{
          |  "TimeFilterToDate": "2019-10-30",
          |  "IncludeEachWay": 0,
          |  "OddsStyle": "FRACTIONAL",
          |  "Sports": [
          |    {
          |      "id": 61
          |    }
          |  ],
          |  "MarketTypes": [
          |    {
          |      "id": 3410018
          |    },
          |    {
          |      "id": 3410020
          |    },
          |    {
          |      "id": 3410022
          |    },
          |    {
          |      "id": 3410024
          |    },
          |    {
          |      "id": 3410026
          |    },
          |    {
          |      "id": 3410028
          |    }
          |  ]
          |}""".stripMargin)
      .send()
      .map(response => {
        logger.trace("Received response: {}", response)
        response.unsafeBody
      })
      .map(Json.parse)
  }

  def getOdds = {
    sttp
      .post(uri"https://oddsfeed-sportnation.sbtech.com/odds")
      .contentType(MediaTypes.Json)
      .body(
        """{
          |  "TimeFilterToDate": "2019-10-30",
          |  "IsOption": 0,
          |  "IsLive": 0,
          |  "IncludeEachWay": 0,
          |  "OddsStyle": "FRACTIONAL",
          |  "ShowScore": 0,
          |  "ShowStatus": 0,
          |  "Sports": [
          |    {
          |      "id": 61
          |    }
          |  ],
          |  "MarketTypes": [
          |    {
          |      "id": 3410018
          |    },
          |    {
          |      "id": 3410020
          |    },
          |    {
          |      "id": 3410022
          |    },
          |    {
          |      "id": 3410024
          |    },
          |    {
          |      "id": 3410026
          |    },
          |    {
          |      "id": 3410028
          |    }
          |  ]
          |}""".stripMargin)
      .send()
      .map(response => {
        logger.trace("Received response: {}", response)
        response.unsafeBody
      })
      .map(Json.parse)
  }
}
