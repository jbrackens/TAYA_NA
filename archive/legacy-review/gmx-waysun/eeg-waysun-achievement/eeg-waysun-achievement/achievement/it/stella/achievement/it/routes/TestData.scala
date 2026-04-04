package stella.achievement.it.routes

import scala.concurrent.Await
import scala.concurrent.ExecutionContext
import scala.concurrent.duration.FiniteDuration

import stella.common.core.OffsetDateTimeUtils.nowUtc
import stella.common.models.Ids.ProjectId

import stella.achievement.db.AchievementEventRepository
import stella.achievement.models.AchievementEventDetailsEntityWithFields
import stella.achievement.models.AchievementEventDetailsFieldEntity
import stella.achievement.models.AchievementEventEntityWithActionDetails
import stella.achievement.models.AchievementWebhookDetailsEntityWithFields
import stella.achievement.models.AchievementWebhookDetailsFieldEntity
import stella.achievement.models.ActionType
import stella.achievement.models.FieldValueType
import stella.achievement.models.Ids.AchievementConfigurationRulePublicId
import stella.achievement.models.Ids.EventConfigurationPublicId
import stella.achievement.models.Ids._
import stella.achievement.models.RequestType

class TestData {

  val projectId1: ProjectId = ProjectId.random()
  val projectId2: ProjectId = ProjectId.random()
  val achievementRuleId1: AchievementConfigurationRulePublicId = AchievementConfigurationRulePublicId.random()
  val achievementRuleId2: AchievementConfigurationRulePublicId = AchievementConfigurationRulePublicId.random()
  // to be replaced by a real value after insert to db
  private val dummyAchievementEventId = AchievementEventId(0)
  private val range1Start = None
  private val range1End = None
  private val range2Start = nowUtc().minusDays(21)
  private val range2End = range2Start.plusDays(7)
  private val range3Start = range2End
  private val range3End = range3Start.plusDays(7)
  private val range4Start = range3End
  private val range4End = range3Start.plusDays(7)

  object project1AchievementRule1Events {

    val achievementEventWithEventForRange1: AchievementEventEntityWithActionDetails = {
      val createdAt = nowUtc().minusDays(2).minusMinutes(5)
      AchievementEventEntityWithActionDetails(
        id = dummyAchievementEventId,
        projectId = projectId1,
        achievementRuleId = achievementRuleId1,
        achievementOriginDate = createdAt.minusMinutes(7),
        groupByFieldValue = "e_foo",
        actionType = ActionType.Event,
        windowRangeStart = range1Start,
        windowRangeEnd = range1End,
        achievementEventDetails = Some(
          AchievementEventDetailsEntityWithFields(
            id = AchievementEventDetailsId(0),
            eventConfigurationId = EventConfigurationPublicId.random(),
            fields = List(AchievementEventDetailsFieldEntity(
              id = AchievementEventDetailsFieldId(0),
              achievementEventDetailsId = AchievementEventDetailsId(0),
              fieldName = "foo_field",
              valueType = FieldValueType.Boolean,
              value = "true",
              createAt = createdAt)),
            createdAt = createdAt)),
        achievementWebhookDetails = None,
        createdAt = createdAt)
    }

    val achievementEventWithEvent2ForRange1: AchievementEventEntityWithActionDetails = {
      val createdAt = nowUtc().minusDays(2)
      AchievementEventEntityWithActionDetails(
        id = dummyAchievementEventId,
        projectId = projectId1,
        achievementRuleId = achievementRuleId1,
        achievementOriginDate = createdAt.minusMinutes(1),
        groupByFieldValue = "d_foo2",
        actionType = ActionType.Event,
        windowRangeStart = range1Start,
        windowRangeEnd = range1End,
        achievementEventDetails = Some(
          AchievementEventDetailsEntityWithFields(
            id = AchievementEventDetailsId(0),
            eventConfigurationId = EventConfigurationPublicId.random(),
            fields = List(
              AchievementEventDetailsFieldEntity(
                id = AchievementEventDetailsFieldId(0),
                achievementEventDetailsId = AchievementEventDetailsId(0),
                fieldName = "foo2_field1",
                valueType = FieldValueType.Boolean,
                value = "false",
                createAt = createdAt),
              AchievementEventDetailsFieldEntity(
                id = AchievementEventDetailsFieldId(0),
                achievementEventDetailsId = AchievementEventDetailsId(0),
                fieldName = "foo2_field2",
                valueType = FieldValueType.Integer,
                value = "-15",
                createAt = createdAt)),
            createdAt = createdAt)),
        achievementWebhookDetails = None,
        createdAt = createdAt)
    }

    val achievementEventWithWebhookWithEventForRange1: AchievementEventEntityWithActionDetails = {
      val createdAt = nowUtc().minusDays(1).minusMinutes(10)
      AchievementEventEntityWithActionDetails(
        id = dummyAchievementEventId,
        projectId = projectId1,
        achievementRuleId = achievementRuleId1,
        achievementOriginDate = createdAt.minusMinutes(20),
        groupByFieldValue = "c_bar",
        actionType = ActionType.Event,
        windowRangeStart = range1Start,
        windowRangeEnd = range1End,
        achievementEventDetails = None,
        achievementWebhookDetails = Some(
          AchievementWebhookDetailsEntityWithFields(
            id = AchievementWebhookDetailsId(0),
            eventConfigurationId = Some(EventConfigurationPublicId.random()),
            requestType = RequestType.Post,
            url = "http://test.webhook.com",
            fields = List(
              AchievementWebhookDetailsFieldEntity(
                id = AchievementWebhookDetailsFieldId(0),
                achievementWebhookDetailsId = AchievementWebhookDetailsId(0),
                fieldName = "bar_field1",
                valueType = FieldValueType.String,
                value = "qwerty uiop",
                createAt = createdAt),
              AchievementWebhookDetailsFieldEntity(
                id = AchievementWebhookDetailsFieldId(0),
                achievementWebhookDetailsId = AchievementWebhookDetailsId(0),
                fieldName = "bar_field2",
                valueType = FieldValueType.Float,
                value = "17.3",
                createAt = createdAt)),
            createdAt = createdAt)),
        createdAt = createdAt)
    }

    val achievementEventWithWebhookWithEvent2ForRange1: AchievementEventEntityWithActionDetails = {
      val createdAt = nowUtc().minusDays(1)
      AchievementEventEntityWithActionDetails(
        id = dummyAchievementEventId,
        projectId = projectId1,
        achievementRuleId = achievementRuleId1,
        achievementOriginDate = createdAt.minusMinutes(2),
        groupByFieldValue = "b_bar2",
        actionType = ActionType.Event,
        windowRangeStart = range1Start,
        windowRangeEnd = range1End,
        achievementEventDetails = None,
        achievementWebhookDetails = Some(
          AchievementWebhookDetailsEntityWithFields(
            id = AchievementWebhookDetailsId(0),
            eventConfigurationId = Some(EventConfigurationPublicId.random()),
            requestType = RequestType.Post,
            url = "http://test.webhook.com/b",
            fields = List(AchievementWebhookDetailsFieldEntity(
              id = AchievementWebhookDetailsFieldId(0),
              achievementWebhookDetailsId = AchievementWebhookDetailsId(0),
              fieldName = "bar2_field",
              valueType = FieldValueType.Integer,
              value = "40",
              createAt = createdAt)),
            createdAt = createdAt)),
        createdAt = createdAt)
    }

    val achievementEventWithWebhookWithoutEventForRange1: AchievementEventEntityWithActionDetails = {
      val createdAt = nowUtc()
      AchievementEventEntityWithActionDetails(
        id = dummyAchievementEventId,
        projectId = projectId1,
        achievementRuleId = achievementRuleId1,
        achievementOriginDate = createdAt.minusMinutes(3),
        groupByFieldValue = "a_baz",
        actionType = ActionType.Event,
        windowRangeStart = range1Start,
        windowRangeEnd = range1End,
        achievementEventDetails = None,
        achievementWebhookDetails = Some(
          AchievementWebhookDetailsEntityWithFields(
            id = AchievementWebhookDetailsId(0),
            eventConfigurationId = None,
            requestType = RequestType.Delete,
            url = "https://test.webhook2.uk/delete",
            fields = Nil,
            createdAt = createdAt)),
        createdAt = createdAt)
    }

    val achievementEventWithEventForRange2: AchievementEventEntityWithActionDetails = {
      val createdAt = nowUtc().minusDays(2)
      AchievementEventEntityWithActionDetails(
        id = dummyAchievementEventId,
        projectId = projectId1,
        achievementRuleId = achievementRuleId1,
        achievementOriginDate = createdAt.minusMinutes(1),
        groupByFieldValue = "b_foo2",
        actionType = ActionType.Event,
        windowRangeStart = Some(range2Start),
        windowRangeEnd = Some(range2End),
        achievementEventDetails = Some(
          AchievementEventDetailsEntityWithFields(
            id = AchievementEventDetailsId(0),
            eventConfigurationId = EventConfigurationPublicId.random(),
            fields = List(
              AchievementEventDetailsFieldEntity(
                id = AchievementEventDetailsFieldId(0),
                achievementEventDetailsId = AchievementEventDetailsId(0),
                fieldName = "foo2_field1",
                valueType = FieldValueType.Boolean,
                value = "false",
                createAt = createdAt),
              AchievementEventDetailsFieldEntity(
                id = AchievementEventDetailsFieldId(0),
                achievementEventDetailsId = AchievementEventDetailsId(0),
                fieldName = "foo2_field2",
                valueType = FieldValueType.Integer,
                value = "-15",
                createAt = createdAt)),
            createdAt = createdAt)),
        achievementWebhookDetails = None,
        createdAt = createdAt)
    }

    val achievementEventWithWebhookWithEventForRange3: AchievementEventEntityWithActionDetails = {
      val createdAt = nowUtc().minusDays(1).minusMinutes(10)
      AchievementEventEntityWithActionDetails(
        id = dummyAchievementEventId,
        projectId = projectId1,
        achievementRuleId = achievementRuleId1,
        achievementOriginDate = createdAt.minusMinutes(20),
        groupByFieldValue = "qwerty",
        actionType = ActionType.Event,
        windowRangeStart = Some(range3Start),
        windowRangeEnd = Some(range3End),
        achievementEventDetails = None,
        achievementWebhookDetails = Some(
          AchievementWebhookDetailsEntityWithFields(
            id = AchievementWebhookDetailsId(0),
            eventConfigurationId = Some(EventConfigurationPublicId.random()),
            requestType = RequestType.Post,
            url = "http://range3.webhook.com",
            fields = List(
              AchievementWebhookDetailsFieldEntity(
                id = AchievementWebhookDetailsFieldId(0),
                achievementWebhookDetailsId = AchievementWebhookDetailsId(0),
                fieldName = "qwerty_field1",
                valueType = FieldValueType.String,
                value = "Let it go, let it go. Can't hold it back anymore...",
                createAt = createdAt),
              AchievementWebhookDetailsFieldEntity(
                id = AchievementWebhookDetailsFieldId(0),
                achievementWebhookDetailsId = AchievementWebhookDetailsId(0),
                fieldName = "qwerty_field2",
                valueType = FieldValueType.String,
                value = "Hakuna Matata! What a wonderful phrase...",
                createAt = createdAt)),
            createdAt = createdAt)),
        createdAt = createdAt)
    }

    val achievementEventWithWebhookWithoutEventForRange4: AchievementEventEntityWithActionDetails = {
      val createdAt = nowUtc()
      AchievementEventEntityWithActionDetails(
        id = dummyAchievementEventId,
        projectId = projectId1,
        achievementRuleId = achievementRuleId1,
        achievementOriginDate = createdAt.minusMinutes(3),
        groupByFieldValue = "valvalval",
        actionType = ActionType.Event,
        windowRangeStart = Some(range4Start),
        windowRangeEnd = Some(range4End),
        achievementEventDetails = None,
        achievementWebhookDetails = Some(
          AchievementWebhookDetailsEntityWithFields(
            id = AchievementWebhookDetailsId(0),
            eventConfigurationId = None,
            requestType = RequestType.Delete,
            url = "https://range4.webhook.com/delete",
            fields = Nil,
            createdAt = createdAt)),
        createdAt = createdAt)
    }

    val achievementEventsToCreate =
      List(
        achievementEventWithEventForRange1,
        achievementEventWithEvent2ForRange1,
        achievementEventWithWebhookWithEventForRange1,
        achievementEventWithWebhookWithEvent2ForRange1,
        achievementEventWithWebhookWithoutEventForRange1,
        achievementEventWithEventForRange2,
        achievementEventWithWebhookWithEventForRange3,
        achievementEventWithWebhookWithoutEventForRange4)
  }

  object project1AchievementRule2Events {

    val achievementEventWithEventForRange1: AchievementEventEntityWithActionDetails = {
      val createdAt = nowUtc().minusDays(2).minusMinutes(5)
      AchievementEventEntityWithActionDetails(
        id = dummyAchievementEventId,
        projectId = projectId1,
        achievementRuleId = achievementRuleId2,
        achievementOriginDate = createdAt.minusMinutes(7),
        groupByFieldValue = "username",
        actionType = ActionType.Event,
        windowRangeStart = range1Start,
        windowRangeEnd = range1End,
        achievementEventDetails = Some(
          AchievementEventDetailsEntityWithFields(
            id = AchievementEventDetailsId(0),
            eventConfigurationId = EventConfigurationPublicId.random(),
            fields = List(AchievementEventDetailsFieldEntity(
              id = AchievementEventDetailsFieldId(0),
              achievementEventDetailsId = AchievementEventDetailsId(0),
              fieldName = "myIntField",
              valueType = FieldValueType.Integer,
              value = "1500100900",
              createAt = createdAt)),
            createdAt = createdAt)),
        achievementWebhookDetails = None,
        createdAt = createdAt)
    }
  }

  object project2AchievementRule1Events {
    val achievementEventWithWebhookWithoutEventForRange1: AchievementEventEntityWithActionDetails = {
      val createdAt = nowUtc()
      AchievementEventEntityWithActionDetails(
        id = dummyAchievementEventId,
        projectId = projectId2,
        achievementRuleId = achievementRuleId1,
        achievementOriginDate = createdAt.minusMinutes(3),
        groupByFieldValue = "project 2 field",
        actionType = ActionType.Event,
        windowRangeStart = range1Start,
        windowRangeEnd = range1End,
        achievementEventDetails = None,
        achievementWebhookDetails = Some(
          AchievementWebhookDetailsEntityWithFields(
            id = AchievementWebhookDetailsId(0),
            eventConfigurationId = None,
            requestType = RequestType.Delete,
            url = "https://test.webhook.project2.uk/delete",
            fields = Nil,
            createdAt = createdAt)),
        createdAt = createdAt)
    }
  }

  def populateDatabaseWithDefaultData(
      repository: AchievementEventRepository,
      achievementsPopulationTimeLimit: FiniteDuration)(implicit ec: ExecutionContext): Unit = {
    Await.result(
      repository.createAchievementEvents(
        project1AchievementRule1Events.achievementEventsToCreate :+ project1AchievementRule2Events.achievementEventWithEventForRange1 :+ project2AchievementRule1Events.achievementEventWithWebhookWithoutEventForRange1),
      achievementsPopulationTimeLimit)
  }

  def storeNewEvent(
      achievementEvent: AchievementEventEntityWithActionDetails,
      repository: AchievementEventRepository,
      resultPublicationTimeLimit: FiniteDuration)(implicit ec: ExecutionContext): Unit = {
    Await.result(
      repository.createAchievementEvents(achievementEvents = Seq(achievementEvent)),
      resultPublicationTimeLimit)
  }
}
