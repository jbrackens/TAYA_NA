package tech.argyll.gmx.predictorgame
// AUTO-GENERATED Slick data model
/** Stand-alone Slick data model for immediate use */
object Tables extends {
  val profile = slick.jdbc.PostgresProfile
} with Tables

/** Slick data model trait for extension, choice of backend or usage in the cake pattern. (Make sure to initialize this late.) */
trait Tables {
  val profile: slick.jdbc.JdbcProfile
  import profile.api._
  import slick.model.ForeignKeyAction
  // NOTE: GetResult mappers for plain SQL are only generated for tables where Slick knows how to map the types of all columns.
  import slick.jdbc.{GetResult => GR}

  /** DDL for all tables. Call .create to execute. */
  lazy val schema: profile.SchemaDescription = Array(Competition.schema, EventPredictions.schema, Events.schema, FlywaySchemaHistory.schema, Leaderboard.schema, LeaderboardEntry.schema, Rounds.schema, UserAccountMapping.schema, UserPredictions.schema, Users.schema).reduceLeft(_ ++ _)
  @deprecated("Use .schema instead of .ddl", "3.0")
  def ddl = schema

  /** Entity class storing rows of table Competition
   *  @param id Database column id SqlType(varchar), PrimaryKey, Length(22,true)
   *  @param name Database column name SqlType(varchar), Length(256,true) */
  case class CompetitionRow(id: String, name: String)
  /** GetResult implicit for fetching CompetitionRow objects using plain SQL queries */
  implicit def GetResultCompetitionRow(implicit e0: GR[String]): GR[CompetitionRow] = GR{
    prs => import prs._
    CompetitionRow.tupled((<<[String], <<[String]))
  }
  /** Table description of table competition. Objects of this class serve as prototypes for rows in queries. */
  class Competition(_tableTag: Tag) extends profile.api.Table[CompetitionRow](_tableTag, Some("predictor"), "competition") {
    def * = (id, name) <> (CompetitionRow.tupled, CompetitionRow.unapply)
    /** Maps whole row to an option. Useful for outer joins. */
    def ? = (Rep.Some(id), Rep.Some(name)).shaped.<>({r=>import r._; _1.map(_=> CompetitionRow.tupled((_1.get, _2.get)))}, (_:Any) =>  throw new Exception("Inserting into ? projection not supported."))

    /** Database column id SqlType(varchar), PrimaryKey, Length(22,true) */
    val id: Rep[String] = column[String]("id", O.PrimaryKey, O.Length(22,varying=true))
    /** Database column name SqlType(varchar), Length(256,true) */
    val name: Rep[String] = column[String]("name", O.Length(256,varying=true))
  }
  /** Collection-like TableQuery object for table Competition */
  lazy val Competition = new TableQuery(tag => new Competition(tag))

  /** Entity class storing rows of table EventPredictions
   *  @param id Database column id SqlType(varchar), PrimaryKey, Length(22,true)
   *  @param predictionId Database column prediction_id SqlType(varchar), Length(22,true)
   *  @param eventId Database column event_id SqlType(varchar), Length(22,true)
   *  @param selection Database column selection SqlType(varchar), Length(255,true), Default(None)
   *  @param points Database column points SqlType(int4)
   *  @param locked Database column locked SqlType(bool), Default(false)
   *  @param score Database column score SqlType(int4), Default(None) */
  case class EventPredictionsRow(id: String, predictionId: String, eventId: String, selection: Option[String] = None, points: Int, locked: Boolean = false, score: Option[Int] = None)
  /** GetResult implicit for fetching EventPredictionsRow objects using plain SQL queries */
  implicit def GetResultEventPredictionsRow(implicit e0: GR[String], e1: GR[Option[String]], e2: GR[Int], e3: GR[Boolean], e4: GR[Option[Int]]): GR[EventPredictionsRow] = GR{
    prs => import prs._
    EventPredictionsRow.tupled((<<[String], <<[String], <<[String], <<?[String], <<[Int], <<[Boolean], <<?[Int]))
  }
  /** Table description of table event_predictions. Objects of this class serve as prototypes for rows in queries. */
  class EventPredictions(_tableTag: Tag) extends profile.api.Table[EventPredictionsRow](_tableTag, Some("predictor"), "event_predictions") {
    def * = (id, predictionId, eventId, selection, points, locked, score) <> (EventPredictionsRow.tupled, EventPredictionsRow.unapply)
    /** Maps whole row to an option. Useful for outer joins. */
    def ? = (Rep.Some(id), Rep.Some(predictionId), Rep.Some(eventId), selection, Rep.Some(points), Rep.Some(locked), score).shaped.<>({r=>import r._; _1.map(_=> EventPredictionsRow.tupled((_1.get, _2.get, _3.get, _4, _5.get, _6.get, _7)))}, (_:Any) =>  throw new Exception("Inserting into ? projection not supported."))

    /** Database column id SqlType(varchar), PrimaryKey, Length(22,true) */
    val id: Rep[String] = column[String]("id", O.PrimaryKey, O.Length(22,varying=true))
    /** Database column prediction_id SqlType(varchar), Length(22,true) */
    val predictionId: Rep[String] = column[String]("prediction_id", O.Length(22,varying=true))
    /** Database column event_id SqlType(varchar), Length(22,true) */
    val eventId: Rep[String] = column[String]("event_id", O.Length(22,varying=true))
    /** Database column selection SqlType(varchar), Length(255,true), Default(None) */
    val selection: Rep[Option[String]] = column[Option[String]]("selection", O.Length(255,varying=true), O.Default(None))
    /** Database column points SqlType(int4) */
    val points: Rep[Int] = column[Int]("points")
    /** Database column locked SqlType(bool), Default(false) */
    val locked: Rep[Boolean] = column[Boolean]("locked", O.Default(false))
    /** Database column score SqlType(int4), Default(None) */
    val score: Rep[Option[Int]] = column[Option[Int]]("score", O.Default(None))

    /** Foreign key referencing Events (database name fk_event_predictions_event_id) */
    lazy val eventsFk = foreignKey("fk_event_predictions_event_id", eventId, Events)(r => r.id, onUpdate=ForeignKeyAction.Restrict, onDelete=ForeignKeyAction.Restrict)
    /** Foreign key referencing UserPredictions (database name fk_event_predictions_prediction_id) */
    lazy val userPredictionsFk = foreignKey("fk_event_predictions_prediction_id", predictionId, UserPredictions)(r => r.id, onUpdate=ForeignKeyAction.Restrict, onDelete=ForeignKeyAction.Restrict)

    /** Uniqueness Index over (predictionId,eventId) (database name uq_event_predictions_prediction_id_event_id) */
    val index1 = index("uq_event_predictions_prediction_id_event_id", (predictionId, eventId), unique=true)
  }
  /** Collection-like TableQuery object for table EventPredictions */
  lazy val EventPredictions = new TableQuery(tag => new EventPredictions(tag))

  /** Entity class storing rows of table Events
   *  @param id Database column id SqlType(varchar), PrimaryKey, Length(22,true)
   *  @param startTime Database column start_time SqlType(timestamptz)
   *  @param status Database column status SqlType(varchar), Length(255,true)
   *  @param winner Database column winner SqlType(varchar), Length(255,true), Default(None)
   *  @param roundId Database column round_id SqlType(varchar), Length(22,true), Default()
   *  @param selectionAId Database column selection_a_id SqlType(varchar), Length(22,true)
   *  @param selectionADetails Database column selection_a_details SqlType(jsonb), Length(2147483647,false), Default(None)
   *  @param selectionBId Database column selection_b_id SqlType(varchar), Length(22,true)
   *  @param selectionBDetails Database column selection_b_details SqlType(jsonb), Length(2147483647,false), Default(None)
   *  @param eventDetails Database column event_details SqlType(jsonb), Length(2147483647,false), Default(None) */
  case class EventsRow(id: String, startTime: java.sql.Timestamp, status: String, winner: Option[String] = None, roundId: String = "", selectionAId: String, selectionADetails: Option[String] = None, selectionBId: String, selectionBDetails: Option[String] = None, eventDetails: Option[String] = None)
  /** GetResult implicit for fetching EventsRow objects using plain SQL queries */
  implicit def GetResultEventsRow(implicit e0: GR[String], e1: GR[java.sql.Timestamp], e2: GR[Option[String]]): GR[EventsRow] = GR{
    prs => import prs._
    EventsRow.tupled((<<[String], <<[java.sql.Timestamp], <<[String], <<?[String], <<[String], <<[String], <<?[String], <<[String], <<?[String], <<?[String]))
  }
  /** Table description of table events. Objects of this class serve as prototypes for rows in queries. */
  class Events(_tableTag: Tag) extends profile.api.Table[EventsRow](_tableTag, Some("predictor"), "events") {
    def * = (id, startTime, status, winner, roundId, selectionAId, selectionADetails, selectionBId, selectionBDetails, eventDetails) <> (EventsRow.tupled, EventsRow.unapply)
    /** Maps whole row to an option. Useful for outer joins. */
    def ? = (Rep.Some(id), Rep.Some(startTime), Rep.Some(status), winner, Rep.Some(roundId), Rep.Some(selectionAId), selectionADetails, Rep.Some(selectionBId), selectionBDetails, eventDetails).shaped.<>({r=>import r._; _1.map(_=> EventsRow.tupled((_1.get, _2.get, _3.get, _4, _5.get, _6.get, _7, _8.get, _9, _10)))}, (_:Any) =>  throw new Exception("Inserting into ? projection not supported."))

    /** Database column id SqlType(varchar), PrimaryKey, Length(22,true) */
    val id: Rep[String] = column[String]("id", O.PrimaryKey, O.Length(22,varying=true))
    /** Database column start_time SqlType(timestamptz) */
    val startTime: Rep[java.sql.Timestamp] = column[java.sql.Timestamp]("start_time")
    /** Database column status SqlType(varchar), Length(255,true) */
    val status: Rep[String] = column[String]("status", O.Length(255,varying=true))
    /** Database column winner SqlType(varchar), Length(255,true), Default(None) */
    val winner: Rep[Option[String]] = column[Option[String]]("winner", O.Length(255,varying=true), O.Default(None))
    /** Database column round_id SqlType(varchar), Length(22,true), Default() */
    val roundId: Rep[String] = column[String]("round_id", O.Length(22,varying=true), O.Default(""))
    /** Database column selection_a_id SqlType(varchar), Length(22,true) */
    val selectionAId: Rep[String] = column[String]("selection_a_id", O.Length(22,varying=true))
    /** Database column selection_a_details SqlType(jsonb), Length(2147483647,false), Default(None) */
    val selectionADetails: Rep[Option[String]] = column[Option[String]]("selection_a_details", O.Length(2147483647,varying=false), O.Default(None))
    /** Database column selection_b_id SqlType(varchar), Length(22,true) */
    val selectionBId: Rep[String] = column[String]("selection_b_id", O.Length(22,varying=true))
    /** Database column selection_b_details SqlType(jsonb), Length(2147483647,false), Default(None) */
    val selectionBDetails: Rep[Option[String]] = column[Option[String]]("selection_b_details", O.Length(2147483647,varying=false), O.Default(None))
    /** Database column event_details SqlType(jsonb), Length(2147483647,false), Default(None) */
    val eventDetails: Rep[Option[String]] = column[Option[String]]("event_details", O.Length(2147483647,varying=false), O.Default(None))

    /** Foreign key referencing Rounds (database name fk_events_round_id) */
    lazy val roundsFk = foreignKey("fk_events_round_id", roundId, Rounds)(r => r.id, onUpdate=ForeignKeyAction.Restrict, onDelete=ForeignKeyAction.Restrict)
  }
  /** Collection-like TableQuery object for table Events */
  lazy val Events = new TableQuery(tag => new Events(tag))

  /** Entity class storing rows of table FlywaySchemaHistory
   *  @param installedRank Database column installed_rank SqlType(int4), PrimaryKey
   *  @param version Database column version SqlType(varchar), Length(50,true), Default(None)
   *  @param description Database column description SqlType(varchar), Length(200,true)
   *  @param `type` Database column type SqlType(varchar), Length(20,true)
   *  @param script Database column script SqlType(varchar), Length(1000,true)
   *  @param checksum Database column checksum SqlType(int4), Default(None)
   *  @param installedBy Database column installed_by SqlType(varchar), Length(100,true)
   *  @param installedOn Database column installed_on SqlType(timestamp)
   *  @param executionTime Database column execution_time SqlType(int4)
   *  @param success Database column success SqlType(bool) */
  case class FlywaySchemaHistoryRow(installedRank: Int, version: Option[String] = None, description: String, `type`: String, script: String, checksum: Option[Int] = None, installedBy: String, installedOn: java.sql.Timestamp, executionTime: Int, success: Boolean)
  /** GetResult implicit for fetching FlywaySchemaHistoryRow objects using plain SQL queries */
  implicit def GetResultFlywaySchemaHistoryRow(implicit e0: GR[Int], e1: GR[Option[String]], e2: GR[String], e3: GR[Option[Int]], e4: GR[java.sql.Timestamp], e5: GR[Boolean]): GR[FlywaySchemaHistoryRow] = GR{
    prs => import prs._
    FlywaySchemaHistoryRow.tupled((<<[Int], <<?[String], <<[String], <<[String], <<[String], <<?[Int], <<[String], <<[java.sql.Timestamp], <<[Int], <<[Boolean]))
  }
  /** Table description of table flyway_schema_history. Objects of this class serve as prototypes for rows in queries.
   *  NOTE: The following names collided with Scala keywords and were escaped: type */
  class FlywaySchemaHistory(_tableTag: Tag) extends profile.api.Table[FlywaySchemaHistoryRow](_tableTag, Some("predictor"), "flyway_schema_history") {
    def * = (installedRank, version, description, `type`, script, checksum, installedBy, installedOn, executionTime, success) <> (FlywaySchemaHistoryRow.tupled, FlywaySchemaHistoryRow.unapply)
    /** Maps whole row to an option. Useful for outer joins. */
    def ? = (Rep.Some(installedRank), version, Rep.Some(description), Rep.Some(`type`), Rep.Some(script), checksum, Rep.Some(installedBy), Rep.Some(installedOn), Rep.Some(executionTime), Rep.Some(success)).shaped.<>({r=>import r._; _1.map(_=> FlywaySchemaHistoryRow.tupled((_1.get, _2, _3.get, _4.get, _5.get, _6, _7.get, _8.get, _9.get, _10.get)))}, (_:Any) =>  throw new Exception("Inserting into ? projection not supported."))

    /** Database column installed_rank SqlType(int4), PrimaryKey */
    val installedRank: Rep[Int] = column[Int]("installed_rank", O.PrimaryKey)
    /** Database column version SqlType(varchar), Length(50,true), Default(None) */
    val version: Rep[Option[String]] = column[Option[String]]("version", O.Length(50,varying=true), O.Default(None))
    /** Database column description SqlType(varchar), Length(200,true) */
    val description: Rep[String] = column[String]("description", O.Length(200,varying=true))
    /** Database column type SqlType(varchar), Length(20,true)
     *  NOTE: The name was escaped because it collided with a Scala keyword. */
    val `type`: Rep[String] = column[String]("type", O.Length(20,varying=true))
    /** Database column script SqlType(varchar), Length(1000,true) */
    val script: Rep[String] = column[String]("script", O.Length(1000,varying=true))
    /** Database column checksum SqlType(int4), Default(None) */
    val checksum: Rep[Option[Int]] = column[Option[Int]]("checksum", O.Default(None))
    /** Database column installed_by SqlType(varchar), Length(100,true) */
    val installedBy: Rep[String] = column[String]("installed_by", O.Length(100,varying=true))
    /** Database column installed_on SqlType(timestamp) */
    val installedOn: Rep[java.sql.Timestamp] = column[java.sql.Timestamp]("installed_on")
    /** Database column execution_time SqlType(int4) */
    val executionTime: Rep[Int] = column[Int]("execution_time")
    /** Database column success SqlType(bool) */
    val success: Rep[Boolean] = column[Boolean]("success")

    /** Index over (success) (database name flyway_schema_history_s_idx) */
    val index1 = index("flyway_schema_history_s_idx", success)
  }
  /** Collection-like TableQuery object for table FlywaySchemaHistory */
  lazy val FlywaySchemaHistory = new TableQuery(tag => new FlywaySchemaHistory(tag))

  /** Entity class storing rows of table Leaderboard
   *  @param id Database column id SqlType(varchar), PrimaryKey, Length(22,true)
   *  @param roundId Database column round_id SqlType(varchar), Length(22,true), Default(None)
   *  @param competitionId Database column competition_id SqlType(varchar), Length(22,true) */
  case class LeaderboardRow(id: String, roundId: Option[String] = None, competitionId: String)
  /** GetResult implicit for fetching LeaderboardRow objects using plain SQL queries */
  implicit def GetResultLeaderboardRow(implicit e0: GR[String], e1: GR[Option[String]]): GR[LeaderboardRow] = GR{
    prs => import prs._
    LeaderboardRow.tupled((<<[String], <<?[String], <<[String]))
  }
  /** Table description of table leaderboard. Objects of this class serve as prototypes for rows in queries. */
  class Leaderboard(_tableTag: Tag) extends profile.api.Table[LeaderboardRow](_tableTag, Some("predictor"), "leaderboard") {
    def * = (id, roundId, competitionId) <> (LeaderboardRow.tupled, LeaderboardRow.unapply)
    /** Maps whole row to an option. Useful for outer joins. */
    def ? = (Rep.Some(id), roundId, Rep.Some(competitionId)).shaped.<>({r=>import r._; _1.map(_=> LeaderboardRow.tupled((_1.get, _2, _3.get)))}, (_:Any) =>  throw new Exception("Inserting into ? projection not supported."))

    /** Database column id SqlType(varchar), PrimaryKey, Length(22,true) */
    val id: Rep[String] = column[String]("id", O.PrimaryKey, O.Length(22,varying=true))
    /** Database column round_id SqlType(varchar), Length(22,true), Default(None) */
    val roundId: Rep[Option[String]] = column[Option[String]]("round_id", O.Length(22,varying=true), O.Default(None))
    /** Database column competition_id SqlType(varchar), Length(22,true) */
    val competitionId: Rep[String] = column[String]("competition_id", O.Length(22,varying=true))

    /** Foreign key referencing Competition (database name fk_leaderboard_competition_id) */
    lazy val competitionFk = foreignKey("fk_leaderboard_competition_id", competitionId, Competition)(r => r.id, onUpdate=ForeignKeyAction.Restrict, onDelete=ForeignKeyAction.Restrict)
    /** Foreign key referencing Rounds (database name fk_leaderboard_round_id) */
    lazy val roundsFk = foreignKey("fk_leaderboard_round_id", roundId, Rounds)(r => Rep.Some(r.id), onUpdate=ForeignKeyAction.Restrict, onDelete=ForeignKeyAction.Restrict)
  }
  /** Collection-like TableQuery object for table Leaderboard */
  lazy val Leaderboard = new TableQuery(tag => new Leaderboard(tag))

  /** Entity class storing rows of table LeaderboardEntry
   *  @param id Database column id SqlType(varchar), PrimaryKey, Length(22,true)
   *  @param leaderboardId Database column leaderboard_id SqlType(varchar), Length(22,true)
   *  @param userId Database column user_id SqlType(varchar), Length(22,true)
   *  @param score Database column score SqlType(int4)
   *  @param position Database column position SqlType(int4), Default(None) */
  case class LeaderboardEntryRow(id: String, leaderboardId: String, userId: String, score: Int, position: Option[Int] = None)
  /** GetResult implicit for fetching LeaderboardEntryRow objects using plain SQL queries */
  implicit def GetResultLeaderboardEntryRow(implicit e0: GR[String], e1: GR[Int], e2: GR[Option[Int]]): GR[LeaderboardEntryRow] = GR{
    prs => import prs._
    LeaderboardEntryRow.tupled((<<[String], <<[String], <<[String], <<[Int], <<?[Int]))
  }
  /** Table description of table leaderboard_entry. Objects of this class serve as prototypes for rows in queries. */
  class LeaderboardEntry(_tableTag: Tag) extends profile.api.Table[LeaderboardEntryRow](_tableTag, Some("predictor"), "leaderboard_entry") {
    def * = (id, leaderboardId, userId, score, position) <> (LeaderboardEntryRow.tupled, LeaderboardEntryRow.unapply)
    /** Maps whole row to an option. Useful for outer joins. */
    def ? = (Rep.Some(id), Rep.Some(leaderboardId), Rep.Some(userId), Rep.Some(score), position).shaped.<>({r=>import r._; _1.map(_=> LeaderboardEntryRow.tupled((_1.get, _2.get, _3.get, _4.get, _5)))}, (_:Any) =>  throw new Exception("Inserting into ? projection not supported."))

    /** Database column id SqlType(varchar), PrimaryKey, Length(22,true) */
    val id: Rep[String] = column[String]("id", O.PrimaryKey, O.Length(22,varying=true))
    /** Database column leaderboard_id SqlType(varchar), Length(22,true) */
    val leaderboardId: Rep[String] = column[String]("leaderboard_id", O.Length(22,varying=true))
    /** Database column user_id SqlType(varchar), Length(22,true) */
    val userId: Rep[String] = column[String]("user_id", O.Length(22,varying=true))
    /** Database column score SqlType(int4) */
    val score: Rep[Int] = column[Int]("score")
    /** Database column position SqlType(int4), Default(None) */
    val position: Rep[Option[Int]] = column[Option[Int]]("position", O.Default(None))

    /** Foreign key referencing Leaderboard (database name fk_leaderboard_entry_leaderboard_id) */
    lazy val leaderboardFk = foreignKey("fk_leaderboard_entry_leaderboard_id", leaderboardId, Leaderboard)(r => r.id, onUpdate=ForeignKeyAction.Restrict, onDelete=ForeignKeyAction.Restrict)
    /** Foreign key referencing Users (database name fk_leaderboard_entry_user_id) */
    lazy val usersFk = foreignKey("fk_leaderboard_entry_user_id", userId, Users)(r => r.id, onUpdate=ForeignKeyAction.Restrict, onDelete=ForeignKeyAction.Restrict)

    /** Uniqueness Index over (leaderboardId,userId) (database name uq_leaderboard_entry_leaderboard_id_user_id) */
    val index1 = index("uq_leaderboard_entry_leaderboard_id_user_id", (leaderboardId, userId), unique=true)
  }
  /** Collection-like TableQuery object for table LeaderboardEntry */
  lazy val LeaderboardEntry = new TableQuery(tag => new LeaderboardEntry(tag))

  /** Entity class storing rows of table Rounds
   *  @param id Database column id SqlType(varchar), PrimaryKey, Length(22,true)
   *  @param number Database column number SqlType(int4)
   *  @param startTime Database column start_time SqlType(timestamptz)
   *  @param endTime Database column end_time SqlType(timestamptz)
   *  @param pickDeadline Database column pick_deadline SqlType(timestamptz), Default(None)
   *  @param competitionId Database column competition_id SqlType(varchar), Length(22,true) */
  case class RoundsRow(id: String, number: Int, startTime: java.sql.Timestamp, endTime: java.sql.Timestamp, pickDeadline: Option[java.sql.Timestamp] = None, competitionId: String)
  /** GetResult implicit for fetching RoundsRow objects using plain SQL queries */
  implicit def GetResultRoundsRow(implicit e0: GR[String], e1: GR[Int], e2: GR[java.sql.Timestamp], e3: GR[Option[java.sql.Timestamp]]): GR[RoundsRow] = GR{
    prs => import prs._
    RoundsRow.tupled((<<[String], <<[Int], <<[java.sql.Timestamp], <<[java.sql.Timestamp], <<?[java.sql.Timestamp], <<[String]))
  }
  /** Table description of table rounds. Objects of this class serve as prototypes for rows in queries. */
  class Rounds(_tableTag: Tag) extends profile.api.Table[RoundsRow](_tableTag, Some("predictor"), "rounds") {
    def * = (id, number, startTime, endTime, pickDeadline, competitionId) <> (RoundsRow.tupled, RoundsRow.unapply)
    /** Maps whole row to an option. Useful for outer joins. */
    def ? = (Rep.Some(id), Rep.Some(number), Rep.Some(startTime), Rep.Some(endTime), pickDeadline, Rep.Some(competitionId)).shaped.<>({r=>import r._; _1.map(_=> RoundsRow.tupled((_1.get, _2.get, _3.get, _4.get, _5, _6.get)))}, (_:Any) =>  throw new Exception("Inserting into ? projection not supported."))

    /** Database column id SqlType(varchar), PrimaryKey, Length(22,true) */
    val id: Rep[String] = column[String]("id", O.PrimaryKey, O.Length(22,varying=true))
    /** Database column number SqlType(int4) */
    val number: Rep[Int] = column[Int]("number")
    /** Database column start_time SqlType(timestamptz) */
    val startTime: Rep[java.sql.Timestamp] = column[java.sql.Timestamp]("start_time")
    /** Database column end_time SqlType(timestamptz) */
    val endTime: Rep[java.sql.Timestamp] = column[java.sql.Timestamp]("end_time")
    /** Database column pick_deadline SqlType(timestamptz), Default(None) */
    val pickDeadline: Rep[Option[java.sql.Timestamp]] = column[Option[java.sql.Timestamp]]("pick_deadline", O.Default(None))
    /** Database column competition_id SqlType(varchar), Length(22,true) */
    val competitionId: Rep[String] = column[String]("competition_id", O.Length(22,varying=true))

    /** Foreign key referencing Competition (database name fk_rounds_competition_id) */
    lazy val competitionFk = foreignKey("fk_rounds_competition_id", competitionId, Competition)(r => r.id, onUpdate=ForeignKeyAction.Restrict, onDelete=ForeignKeyAction.Restrict)

    /** Uniqueness Index over (competitionId,number) (database name uq_rounds_competition_id_number) */
    val index1 = index("uq_rounds_competition_id_number", (competitionId, number), unique=true)
  }
  /** Collection-like TableQuery object for table Rounds */
  lazy val Rounds = new TableQuery(tag => new Rounds(tag))

  /** Entity class storing rows of table UserAccountMapping
   *  @param oidcSub Database column oidc_sub SqlType(varchar), Length(255,true)
   *  @param externalId Database column external_id SqlType(varchar), Length(255,true)
   *  @param partnerId Database column partner_id SqlType(varchar), Length(255,true) */
  case class UserAccountMappingRow(oidcSub: String, externalId: String, partnerId: String)
  /** GetResult implicit for fetching UserAccountMappingRow objects using plain SQL queries */
  implicit def GetResultUserAccountMappingRow(implicit e0: GR[String]): GR[UserAccountMappingRow] = GR{
    prs => import prs._
    UserAccountMappingRow.tupled((<<[String], <<[String], <<[String]))
  }
  /** Table description of table user_account_mapping. Objects of this class serve as prototypes for rows in queries. */
  class UserAccountMapping(_tableTag: Tag) extends profile.api.Table[UserAccountMappingRow](_tableTag, Some("predictor"), "user_account_mapping") {
    def * = (oidcSub, externalId, partnerId) <> (UserAccountMappingRow.tupled, UserAccountMappingRow.unapply)
    /** Maps whole row to an option. Useful for outer joins. */
    def ? = (Rep.Some(oidcSub), Rep.Some(externalId), Rep.Some(partnerId)).shaped.<>({r=>import r._; _1.map(_=> UserAccountMappingRow.tupled((_1.get, _2.get, _3.get)))}, (_:Any) =>  throw new Exception("Inserting into ? projection not supported."))

    /** Database column oidc_sub SqlType(varchar), Length(255,true) */
    val oidcSub: Rep[String] = column[String]("oidc_sub", O.Length(255,varying=true))
    /** Database column external_id SqlType(varchar), Length(255,true) */
    val externalId: Rep[String] = column[String]("external_id", O.Length(255,varying=true))
    /** Database column partner_id SqlType(varchar), Length(255,true) */
    val partnerId: Rep[String] = column[String]("partner_id", O.Length(255,varying=true))

    /** Uniqueness Index over (oidcSub,partnerId) (database name uq_user_account_mapping_oidc_sub_partner_id) */
    val index1 = index("uq_user_account_mapping_oidc_sub_partner_id", (oidcSub, partnerId), unique=true)
  }
  /** Collection-like TableQuery object for table UserAccountMapping */
  lazy val UserAccountMapping = new TableQuery(tag => new UserAccountMapping(tag))

  /** Entity class storing rows of table UserPredictions
   *  @param id Database column id SqlType(varchar), PrimaryKey, Length(22,true)
   *  @param userId Database column user_id SqlType(varchar), Length(22,true)
   *  @param score Database column score SqlType(int4), Default(None)
   *  @param locked Database column locked SqlType(bool), Default(false)
   *  @param roundId Database column round_id SqlType(varchar), Length(22,true), Default()
   *  @param prizeEligible Database column prize_eligible SqlType(bool), Default(true)
   *  @param totalSelections Database column total_selections SqlType(int4), Default(0)
   *  @param correctSelections Database column correct_selections SqlType(int4), Default(0) */
  case class UserPredictionsRow(id: String, userId: String, score: Option[Int] = None, locked: Boolean = false, roundId: String = "", prizeEligible: Boolean = true, totalSelections: Int = 0, correctSelections: Int = 0)
  /** GetResult implicit for fetching UserPredictionsRow objects using plain SQL queries */
  implicit def GetResultUserPredictionsRow(implicit e0: GR[String], e1: GR[Option[Int]], e2: GR[Boolean], e3: GR[Int]): GR[UserPredictionsRow] = GR{
    prs => import prs._
    UserPredictionsRow.tupled((<<[String], <<[String], <<?[Int], <<[Boolean], <<[String], <<[Boolean], <<[Int], <<[Int]))
  }
  /** Table description of table user_predictions. Objects of this class serve as prototypes for rows in queries. */
  class UserPredictions(_tableTag: Tag) extends profile.api.Table[UserPredictionsRow](_tableTag, Some("predictor"), "user_predictions") {
    def * = (id, userId, score, locked, roundId, prizeEligible, totalSelections, correctSelections) <> (UserPredictionsRow.tupled, UserPredictionsRow.unapply)
    /** Maps whole row to an option. Useful for outer joins. */
    def ? = (Rep.Some(id), Rep.Some(userId), score, Rep.Some(locked), Rep.Some(roundId), Rep.Some(prizeEligible), Rep.Some(totalSelections), Rep.Some(correctSelections)).shaped.<>({r=>import r._; _1.map(_=> UserPredictionsRow.tupled((_1.get, _2.get, _3, _4.get, _5.get, _6.get, _7.get, _8.get)))}, (_:Any) =>  throw new Exception("Inserting into ? projection not supported."))

    /** Database column id SqlType(varchar), PrimaryKey, Length(22,true) */
    val id: Rep[String] = column[String]("id", O.PrimaryKey, O.Length(22,varying=true))
    /** Database column user_id SqlType(varchar), Length(22,true) */
    val userId: Rep[String] = column[String]("user_id", O.Length(22,varying=true))
    /** Database column score SqlType(int4), Default(None) */
    val score: Rep[Option[Int]] = column[Option[Int]]("score", O.Default(None))
    /** Database column locked SqlType(bool), Default(false) */
    val locked: Rep[Boolean] = column[Boolean]("locked", O.Default(false))
    /** Database column round_id SqlType(varchar), Length(22,true), Default() */
    val roundId: Rep[String] = column[String]("round_id", O.Length(22,varying=true), O.Default(""))
    /** Database column prize_eligible SqlType(bool), Default(true) */
    val prizeEligible: Rep[Boolean] = column[Boolean]("prize_eligible", O.Default(true))
    /** Database column total_selections SqlType(int4), Default(0) */
    val totalSelections: Rep[Int] = column[Int]("total_selections", O.Default(0))
    /** Database column correct_selections SqlType(int4), Default(0) */
    val correctSelections: Rep[Int] = column[Int]("correct_selections", O.Default(0))

    /** Foreign key referencing Rounds (database name fk_user_predictions_round_id) */
    lazy val roundsFk = foreignKey("fk_user_predictions_round_id", roundId, Rounds)(r => r.id, onUpdate=ForeignKeyAction.Restrict, onDelete=ForeignKeyAction.Restrict)
    /** Foreign key referencing Users (database name fk_user_predictions_user_id) */
    lazy val usersFk = foreignKey("fk_user_predictions_user_id", userId, Users)(r => r.id, onUpdate=ForeignKeyAction.Restrict, onDelete=ForeignKeyAction.Restrict)

    /** Uniqueness Index over (userId,roundId) (database name uq_user_predictions_user_id_round_id) */
    val index1 = index("uq_user_predictions_user_id_round_id", (userId, roundId), unique=true)
  }
  /** Collection-like TableQuery object for table UserPredictions */
  lazy val UserPredictions = new TableQuery(tag => new UserPredictions(tag))

  /** Entity class storing rows of table Users
   *  @param id Database column id SqlType(varchar), PrimaryKey, Length(22,true)
   *  @param oidcSub Database column oidc_sub SqlType(varchar), Length(255,true)
   *  @param externalId Database column external_id SqlType(varchar), Length(255,true), Default(None)
   *  @param partnerId Database column partner_id SqlType(varchar), Length(255,true), Default(None)
   *  @param name Database column name SqlType(varchar), Length(255,true), Default()
   *  @param createdAt Database column created_at SqlType(timestamptz)
   *  @param `type` Database column type SqlType(varchar), Length(25,true), Default(REAL) */
  case class UsersRow(id: String, oidcSub: String, externalId: Option[String] = None, partnerId: Option[String] = None, name: String = "", createdAt: java.sql.Timestamp, `type`: String = "REAL")
  /** GetResult implicit for fetching UsersRow objects using plain SQL queries */
  implicit def GetResultUsersRow(implicit e0: GR[String], e1: GR[Option[String]], e2: GR[java.sql.Timestamp]): GR[UsersRow] = GR{
    prs => import prs._
    UsersRow.tupled((<<[String], <<[String], <<?[String], <<?[String], <<[String], <<[java.sql.Timestamp], <<[String]))
  }
  /** Table description of table users. Objects of this class serve as prototypes for rows in queries.
   *  NOTE: The following names collided with Scala keywords and were escaped: type */
  class Users(_tableTag: Tag) extends profile.api.Table[UsersRow](_tableTag, Some("predictor"), "users") {
    def * = (id, oidcSub, externalId, partnerId, name, createdAt, `type`) <> (UsersRow.tupled, UsersRow.unapply)
    /** Maps whole row to an option. Useful for outer joins. */
    def ? = (Rep.Some(id), Rep.Some(oidcSub), externalId, partnerId, Rep.Some(name), Rep.Some(createdAt), Rep.Some(`type`)).shaped.<>({r=>import r._; _1.map(_=> UsersRow.tupled((_1.get, _2.get, _3, _4, _5.get, _6.get, _7.get)))}, (_:Any) =>  throw new Exception("Inserting into ? projection not supported."))

    /** Database column id SqlType(varchar), PrimaryKey, Length(22,true) */
    val id: Rep[String] = column[String]("id", O.PrimaryKey, O.Length(22,varying=true))
    /** Database column oidc_sub SqlType(varchar), Length(255,true) */
    val oidcSub: Rep[String] = column[String]("oidc_sub", O.Length(255,varying=true))
    /** Database column external_id SqlType(varchar), Length(255,true), Default(None) */
    val externalId: Rep[Option[String]] = column[Option[String]]("external_id", O.Length(255,varying=true), O.Default(None))
    /** Database column partner_id SqlType(varchar), Length(255,true), Default(None) */
    val partnerId: Rep[Option[String]] = column[Option[String]]("partner_id", O.Length(255,varying=true), O.Default(None))
    /** Database column name SqlType(varchar), Length(255,true), Default() */
    val name: Rep[String] = column[String]("name", O.Length(255,varying=true), O.Default(""))
    /** Database column created_at SqlType(timestamptz) */
    val createdAt: Rep[java.sql.Timestamp] = column[java.sql.Timestamp]("created_at")
    /** Database column type SqlType(varchar), Length(25,true), Default(REAL)
     *  NOTE: The name was escaped because it collided with a Scala keyword. */
    val `type`: Rep[String] = column[String]("type", O.Length(25,varying=true), O.Default("REAL"))

    /** Uniqueness Index over (externalId,partnerId) (database name uq_users_external_id_partner_id) */
    val index1 = index("uq_users_external_id_partner_id", (externalId, partnerId), unique=true)
    /** Uniqueness Index over (oidcSub) (database name uq_users_oidc_sub) */
    val index2 = index("uq_users_oidc_sub", oidcSub, unique=true)
  }
  /** Collection-like TableQuery object for table Users */
  lazy val Users = new TableQuery(tag => new Users(tag))
}
