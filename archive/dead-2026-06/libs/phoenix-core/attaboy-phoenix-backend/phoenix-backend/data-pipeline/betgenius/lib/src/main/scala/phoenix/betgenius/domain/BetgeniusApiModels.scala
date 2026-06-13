package phoenix.betgenius.domain

import io.circe.generic.JsonCodec

@JsonCodec(decodeOnly = true)
case class LoginResponse(IdToken: String)

@JsonCodec(decodeOnly = true)
case class FixtureResponse(
    id: Int,
    sportId: Int,
    name: String,
    sportName: String,
    competitionId: Int,
    competitionName: String,
    seasonId: Int,
    seasonName: String,
    startDate: String,
    statusType: String,
    `type`: String,
    fixturecompetitors: Seq[FixtureCompetitor])

@JsonCodec(decodeOnly = true)
case class FixtureCompetitor(competitor: CompetitorResponse)

@JsonCodec(decodeOnly = true)
case class CompetitorResponse(id: Int, name: String)

@JsonCodec(decodeOnly = true)
case class CompetitionResponse(id: Int, name: String, competitionproperty: CompetitionProperty)

@JsonCodec(decodeOnly = true)
case class CompetitionProperty(regionId: Int)
