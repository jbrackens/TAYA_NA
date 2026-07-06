package phoenix.punters

import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.duration.DurationInt
import scala.util.Random

import com.github.javafaker.Faker

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.http.core.Device
import phoenix.http.core.IpAddress
import phoenix.punters.PunterDataGenerator.Api.active
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.Api.suspended
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Events._
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SuspensionEntity.NegativeBalance
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.domain._
import phoenix.punters.idcomply.application.MaximumAmountOfPunters
import phoenix.punters.support.PunterConverters
import phoenix.support.DataGenerator.generateBoolean
import phoenix.support.DataGenerator.generateIdentifier
import phoenix.support.DataGenerator.randomAlphanumericLowerCase
import phoenix.support.DataGenerator.randomBoolean
import phoenix.support.DataGenerator.randomEnumValue
import phoenix.support.DataGenerator.randomNumber
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DataGenerator.randomOption
import phoenix.support.DataGenerator.randomSignInTimestamp
import phoenix.support.DataGenerator.randomString
import phoenix.support.DataGenerator.randomTermsAgreement
import phoenix.support.DataGenerator.randomUUID
import phoenix.support.DataGenerator.randomUserDetails
import phoenix.support.DataGenerator.randomUserDetailsKeycloak
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.support.UserGenerator.generateFullSSN
import phoenix.support.UserGenerator.generatePersonalName
import phoenix.support.UserGenerator.generateUserPreferences
import phoenix.utils.RandomUUIDGenerator
import phoenix.wallets.support.WalletsDataGenerator.generateResponsibilityCheckStatus

object PunterDataGenerator {

  val faker = new Faker()
  val clock: Clock = Clock.utcClock

  object Api {

    val exampleSessionLimits: CurrentAndNextLimits[SessionDuration] = {
      val now = clock.currentOffsetDateTime()
      val alreadyEffective = now.minusYears(1)
      val notYetEffective = now.plusYears(1)

      val currentLimits = Limits.unsafe(
        SessionLimits.Daily.unsafe(SessionDuration(10.hours)),
        SessionLimits.Weekly.unsafe(SessionDuration(2.days)),
        SessionLimits.Monthly.unsafe(SessionDuration(10.days)))

      val nextLimits = Limits.unsafe(
        SessionLimits.Daily.unsafe(SessionDuration(20.hours)),
        SessionLimits.Weekly.unsafe(SessionDuration(4.days)),
        SessionLimits.Monthly.unsafe(SessionDuration(20.days)))

      CurrentAndNextLimits(
        CurrentAndNextLimit(
          EffectiveLimit(currentLimits.daily, since = alreadyEffective),
          next = Some(EffectiveLimit(nextLimits.daily, since = notYetEffective))),
        CurrentAndNextLimit(
          EffectiveLimit(currentLimits.weekly, since = alreadyEffective),
          next = Some(EffectiveLimit(nextLimits.weekly, since = notYetEffective))),
        CurrentAndNextLimit(
          EffectiveLimit(currentLimits.monthly, since = alreadyEffective),
          next = Some(EffectiveLimit(nextLimits.monthly, since = notYetEffective))))
    }

    private val lowDepositLimits: CurrentAndNextLimits[DepositLimitAmount] = {
      val alwaysEffective = OffsetDateTime.ofInstant(Instant.EPOCH, ZoneOffset.UTC)
      val limits = Limits.unsafe(
        daily = Limit.Daily(Some(DepositLimitAmount(MoneyAmount(1)))),
        weekly = Limit.Weekly(Some(DepositLimitAmount(MoneyAmount(2)))),
        monthly = Limit.Monthly(Some(DepositLimitAmount(MoneyAmount(3)))))
      CurrentAndNextLimits(
        CurrentAndNextLimit(EffectiveLimit(limits.daily, since = alwaysEffective), next = None),
        CurrentAndNextLimit(EffectiveLimit(limits.weekly, since = alwaysEffective), next = None),
        CurrentAndNextLimit(EffectiveLimit(limits.monthly, since = alwaysEffective), next = None))
    }

    val noDepositLimits: CurrentAndNextLimits[DepositLimitAmount] = {
      val alwaysEffective = OffsetDateTime.ofInstant(Instant.EPOCH, ZoneOffset.UTC)
      val limits = Limits.none[DepositLimitAmount]
      CurrentAndNextLimits(
        CurrentAndNextLimit(EffectiveLimit(limits.daily, since = alwaysEffective), next = None),
        CurrentAndNextLimit(EffectiveLimit(limits.weekly, since = alwaysEffective), next = None),
        CurrentAndNextLimit(EffectiveLimit(limits.monthly, since = alwaysEffective), next = None))
    }

    val noStakeLimits: CurrentAndNextLimits[StakeLimitAmount] = {
      val alwaysEffective = OffsetDateTime.ofInstant(Instant.EPOCH, ZoneOffset.UTC)
      val limits = Limits.none[StakeLimitAmount]
      CurrentAndNextLimits(
        CurrentAndNextLimit(EffectiveLimit(limits.daily, since = alwaysEffective), next = None),
        CurrentAndNextLimit(EffectiveLimit(limits.weekly, since = alwaysEffective), next = None),
        CurrentAndNextLimit(EffectiveLimit(limits.monthly, since = alwaysEffective), next = None))
    }

    def withStatus(punterStatus: PunterStatus, exclusionStatus: Option[CoolOffStatus] = None): PunterProfile =
      PunterProfile(
        generatePunterId(),
        noDepositLimits,
        noStakeLimits,
        exampleSessionLimits,
        status = punterStatus,
        exclusionStatus = exclusionStatus,
        isTestAccount = false,
        endedSessions = List.empty,
        maybeCurrentSession = None,
        passwordResetRequired = false,
        verifiedAt = None,
        activationPath = None)

    def active(): PunterProfile = withStatus(PunterStatus.Active)

    def selfExcluded(): PunterProfile = withStatus(PunterStatus.SelfExcluded)

    def lowDepositLimit(): PunterProfile = active().copy(depositLimits = lowDepositLimits)

    def inCoolOff(): PunterProfile =
      withStatus(PunterStatus.InCoolOff)
        .copy(exclusionStatus = Some(CoolOffStatus(generateCoolOffPeriod(), CoolOffCause.SelfInitiated)))

    def suspended(): PunterProfile = withStatus(PunterStatus.Suspended(OperatorSuspend("Nastiest boi")))

    def negativeBalance(): PunterProfile = withStatus(PunterStatus.Suspended(NegativeBalance("Low Balance")))

    def deleted(): PunterProfile = withStatus(PunterStatus.Deleted)

    def generatePunterId(): PunterId =
      PunterId(generateIdentifier())

    def generateAdminId(): AdminId =
      AdminId(generateIdentifier())

    def generatePunterName(): String =
      generatePersonalName().toString()

    def generateSessionId(): SessionId =
      SessionId.fromUUID(RandomUUIDGenerator.generate())

    def generateCoolOffPeriod(): CoolOffPeriod = {
      val now = clock.currentOffsetDateTime()
      CoolOffPeriod(now, now.plusDays(faker.number().numberBetween(1, 7)))
    }

    def generateStateCoolOffPeriod(): PunterState.CoolOffPeriod = {
      val now = clock.currentOffsetDateTime()
      PunterState.CoolOffPeriod(now, now.plusDays(faker.number().numberBetween(1, 7)))
    }

    def generatePunterProfileCreatedEvent(): PunterProfileCreated =
      PunterProfileCreated(
        generatePunterId(),
        Limits.none[DepositLimitAmount],
        Limits.none[StakeLimitAmount],
        Limits.none[SessionDuration],
        None,
        isTestAccount = randomBoolean())

    def generatePunterProfileSuspendedEvent(): PunterSuspended =
      PunterSuspended(generatePunterId(), OperatorSuspend("nasti boi"), suspendedAt = randomOffsetDateTime())
    def generatePunterProfileUnsuspendedEvent(): PunterUnsuspended =
      PunterUnsuspended(generatePunterId())
    def generatePunterUnsuspendStartedEvent(): PunterUnsuspendStarted =
      PunterUnsuspendStarted(generatePunterId(), Some(generateAdminId()))
    def generatePunterVerifiedEvent(punterId: PunterId = generatePunterId()): PunterVerified =
      PunterVerified(punterId, ActivationPath.IDPV, clock.currentOffsetDateTime(), verifiedBy = None)
    def generateSessionStartedEvent(punterId: PunterId = generatePunterId()): SessionStarted =
      SessionStarted(
        punterId,
        session = PunterState.StartedSession(
          sessionId = SessionId.fromUUID(randomUUID()),
          startedAt = randomOffsetDateTime(),
          limitation = SessionLimitation.Unlimited(randomOffsetDateTime()),
          ipAddress = Some(generateIpAddress())),
        ipAddress = Some(generateIpAddress()))
    def generateSessionEndedEvent(
        punterId: PunterId = generatePunterId(),
        sessionId: SessionId = SessionId.fromUUID(randomUUID()),
        startedAt: OffsetDateTime = randomOffsetDateTime()): SessionEnded =
      SessionEnded(
        punterId,
        session = PunterState.EndedSession(
          sessionId,
          startedAt,
          limitation = SessionLimitation.Unlimited(randomOffsetDateTime()),
          endedAt = randomOffsetDateTime()))
  }

  def generateUserId(): UserId = UserId(randomUUID())

  def generateRegisteredUser(): RegisteredUser =
    RegisteredUser(
      userId = generateUserId(),
      details = randomUserDetails(),
      verified = randomBoolean(),
      admin = randomBoolean(),
      lastSignIn = Some(LastSignInData(randomSignInTimestamp(), IpAddress("127.0.0.1"))))

  def generateRegisteredUserKeycloak(): RegisteredUserKeycloak =
    RegisteredUserKeycloak(userId = generateUserId(), details = randomUserDetailsKeycloak(), admin = randomBoolean())

  def generateSuspendedRegisteredUser(): RegisteredUser =
    RegisteredUser(
      userId = generateUserId(),
      details = randomUserDetails(),
      verified = randomBoolean(),
      admin = randomBoolean(),
      lastSignIn = randomOption(LastSignInData(randomSignInTimestamp(), IpAddress("127.0.0.1"))))

  def generateCurrentTermsVersion(): CurrentTermsVersion = CurrentTermsVersion(randomNumber(1, 1000))
  def generateTermsContent(): TermsContent = TermsContent(randomString())
  def generateTermsDayThreshold(): TermsDaysThreshold = TermsDaysThreshold(randomNumber(10, 1000))

  def generateTermsAndConditions(): Terms =
    Terms(generateCurrentTermsVersion(), generateTermsContent(), generateTermsDayThreshold())

  def generateUserProfile(): UserProfile =
    UserProfile.from(
      active(),
      generatePunterWithSSN(),
      generateRegisteredUserKeycloak(),
      hasToAcceptTerms = randomBoolean(),
      generateResponsibilityCheckStatus())

  def generateUserPersonalDetails(): UserPersonalDetails = {
    val userDetails = randomUserDetails()
    UserPersonalDetails(
      userDetails.name,
      userDetails.address,
      userDetails.email,
      userDetails.phoneNumber,
      userDetails.dateOfBirth)
  }

  def generateLastSignIn(): LastSignInData = LastSignInData(randomSignInTimestamp(), IpAddress("127.0.0.1"))

  def generatePunterSettings(): PunterSettings = {
    PunterSettings(
      Some(generateLastSignIn()),
      generateUserPreferences(),
      randomTermsAgreement(),
      randomOffsetDateTime(),
      generateBoolean(),
      generateBoolean(),
      generateBoolean())
  }

  def generatePunter(): Punter = {
    val ssn = generateFullSSN()
    Punter(
      generatePunterId(),
      generatePunterPersonalDetails(),
      randomOption(ssn).toRight(ssn.last4Digits),
      generatePunterSettings())
  }

  def generatePunterWithSSN(
      punterId: PunterId = generatePunterId(),
      ssn: FullSSN = generateFullSSN(),
      maybeUsername: Option[Username] = None,
      maybeEmail: Option[Email] = None): Punter = {
    val details = generatePunterPersonalDetails()
    val det1 = maybeUsername.map(u => details.copy(userName = u)).getOrElse(details)
    val det2 = maybeEmail.map(email => det1.copy(email = email)).getOrElse(det1)
    Punter(punterId, det2, Right(ssn), generatePunterSettings())
  }

  def generatePunterWithPartialSSN(
      punterId: PunterId = generatePunterId(),
      ssn: FullSSN = generateFullSSN()): Punter = {
    Punter(punterId, generatePunterPersonalDetails(), ssn = Left(ssn.last4Digits), generatePunterSettings())
  }

  def generatePunterPersonalDetails(): PunterPersonalDetails =
    PunterConverters.createPersonalDetails(randomUserDetails())

  def generateSuspendedUserProfile(): UserProfile =
    UserProfile.from(
      suspended(),
      generatePunterWithSSN(),
      generateRegisteredUserKeycloak(),
      hasToAcceptTerms = randomBoolean(),
      generateResponsibilityCheckStatus())

  def generateVerificationCode(): MultifactorVerificationCode =
    MultifactorVerificationCode.unsafe(LazyList.continually(randomNumber(1, 9)).take(6).mkString)

  def generateTwilioVerificationId(): MultifactorVerificationId =
    MultifactorVerificationId("VE" + randomAlphanumericLowerCase().take(33).mkString)

  def createDepositLimitAmount(amount: BigDecimal): DepositLimitAmount = {
    DepositLimitAmount
      .fromMoneyAmount(MoneyAmount(amount))
      .valueOr(error => throw new RuntimeException(s"Invalid value for deposit limit amount '$error'"))
  }

  def createStakeLimitAmount(amount: BigDecimal): StakeLimitAmount =
    StakeLimitAmount
      .fromMoneyAmount(MoneyAmount(amount))
      .valueOr(error => throw new RuntimeException(s"Invalid value for loss limit amount '$error'"))

  def generateSelfExclusionDuration(): SelfExclusionDuration =
    randomEnumValue[SelfExclusionDuration]()

  def generateMaximumAmountOfPunters(): MaximumAmountOfPunters =
    MaximumAmountOfPunters(randomNumber(10, 100))

  def generatePuntersDomainConfig(): PuntersDomainConfig =
    PuntersDomainConfig(
      generateMaximumAmountOfPunters(),
      MFAConfig(enabledByDefault = randomBoolean(), changeAllowed = randomBoolean(), mandatoryForRegistration = false))

  def randomActivationPath(): ActivationPath = randomEnumValue[ActivationPath]()

  def generateLimitChange(): LimitChange = {
    val now = clock.currentOffsetDateTime()
    LimitChange(
      punterId = generatePunterId(),
      limitType = generateLimitType(),
      period = generateLimitPeriod(),
      limit = generateLimit(),
      effectiveFrom = now,
      requestedAt = now,
      id = None)
  }

  def generateLimitChanges(count: Int): Seq[LimitChange] = {
    require(count > 0, "Count of Limit Changes must be > 0")

    val punterId = generatePunterId()
    val now = clock.currentOffsetDateTime()

    for (i <- 1 to count)
      yield generateLimitChange().copy(
        punterId = punterId,
        requestedAt = now.plusSeconds(i * 10L),
        effectiveFrom = now.plusSeconds(i * 10L),
        id = Some(i))
  }

  def generateCoolOffs(count: Int): Seq[PunterCoolOffEntry] = {
    require(count > 0, "Count of cooloffs must be > 0")

    val punterId = generatePunterId()
    val now = clock.currentOffsetDateTime()

    for (i <- 1 to count)
      yield PunterCoolOffEntry(
        punterId = punterId,
        coolOffStart = now.plusDays(i),
        coolOffEnd = now.plusDays(i).plusHours(i),
        coolOffCause = randomEnumValue[CoolOffCause]())
  }

  def generateLimitType(): ResponsibleGamblingLimitType = randomEnumValue[ResponsibleGamblingLimitType]()

  def generateLimitPeriod(): LimitPeriodType = randomEnumValue[LimitPeriodType]()

  def generateLimit(): String = randomString()

  def getLimitTypeRawString(limitType: ResponsibleGamblingLimitType): String =
    limitType match {
      case ResponsibleGamblingLimitType.DepositAmount => "DEPOSIT_AMOUNT"
      case ResponsibleGamblingLimitType.StakeAmount   => "STAKE_AMOUNT"
      case ResponsibleGamblingLimitType.SessionTime   => "SESSION_TIME"
    }

  def getLimitPeriodRawString(limitPeriod: LimitPeriodType): String =
    limitPeriod match {
      case LimitPeriodType.Day   => "DAY"
      case LimitPeriodType.Week  => "WEEK"
      case LimitPeriodType.Month => "MONTH"
    }

  def generateIpAddress() = {
    def segment = Random.nextInt(256)
    IpAddress(s"$segment.$segment.$segment.$segment")
  }

  def generateDevice() = Device(randomString(20))

  def generateVisitorId(): VisitorId = VisitorId.unsafe(Random.alphanumeric.take(22).mkString)

  def generateConfidence(): Confidence = Confidence.unsafe(Random.nextFloat())

  def generateDeviceFingerprint: DeviceFingerprint =
    DeviceFingerprint(visitorId = generateVisitorId(), confidence = generateConfidence())

  def generatePunterDeviceFingerprint(punterId: PunterId): PunterDeviceFingerprint =
    PunterDeviceFingerprint(
      punterId = punterId,
      timestamp = clock.currentOffsetDateTime(),
      visitorId = generateVisitorId(),
      confidence = generateConfidence())

}
