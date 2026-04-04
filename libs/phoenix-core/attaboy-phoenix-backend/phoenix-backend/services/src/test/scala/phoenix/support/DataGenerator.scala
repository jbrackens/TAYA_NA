package phoenix.support

import java.time.Instant
import java.time.OffsetDateTime
import java.util.Locale
import java.util.UUID
import java.util.concurrent.ThreadLocalRandom

import scala.collection.immutable
import scala.concurrent.duration.DAYS
import scala.concurrent.duration.FiniteDuration
import scala.concurrent.duration.MILLISECONDS
import scala.util.Random

import cats.data.NonEmptyList
import com.github.javafaker.Faker
import enumeratum.Enum
import enumeratum.EnumEntry
import org.passay.CharacterRule
import org.passay.EnglishCharacterData
import org.passay.PasswordGenerator

import phoenix.bets.BetData
import phoenix.bets.BetEntity.BetId
import phoenix.bets.Stake
import phoenix.boundedcontexts.market.FixtureDetails
import phoenix.core.Clock
import phoenix.core.TimeUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.domain.DataProvider
import phoenix.core.odds.Odds
import phoenix.http.core.Geolocation
import phoenix.http.routes.EndpointInputs.baseUrl.PhoenixAppBaseUrl
import phoenix.markets.InitializedMarket
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MarketCategory
import phoenix.markets.MarketInfo
import phoenix.markets.MarketLifecycle
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.MarketAggregate
import phoenix.markets.MarketsBoundedContext.MarketAggregate.FixtureSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SportSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.TournamentSummary
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.markets.MarketsBoundedContext.Sport
import phoenix.markets.MarketsBoundedContext.Tournament
import phoenix.markets.MarketsRepository.Market
import phoenix.markets.MarketsRepository.MarketLifecycleChange
import phoenix.markets.SelectionOdds
import phoenix.markets.UpdateFixtureRequest
import phoenix.markets.UpdateMarketRequest
import phoenix.markets.UpdateMatchStatusRequest
import phoenix.markets.UpdateSportRequest
import phoenix.markets.domain.MarketType
import phoenix.markets.fixtures.FixtureStatus
import phoenix.markets.sports
import phoenix.markets.sports.Fixture
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.markets.sports.SportProtocol.Commands.MatchScore
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterSummary
import phoenix.punters.TalonAppBaseUrl
import phoenix.punters.application.MaybeValidPassword
import phoenix.punters.domain
import phoenix.punters.domain.Address
import phoenix.punters.domain.AddressLine
import phoenix.punters.domain.BettingPreferences
import phoenix.punters.domain.City
import phoenix.punters.domain.CommunicationPreferences
import phoenix.punters.domain.Country
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.Email
import phoenix.punters.domain.FirstName
import phoenix.punters.domain.Gender
import phoenix.punters.domain.LastName
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.SignInTimestamp
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.State
import phoenix.punters.domain.TermsAcceptedVersion
import phoenix.punters.domain.TermsAgreement
import phoenix.punters.domain.Title
import phoenix.punters.domain.UserDetails
import phoenix.punters.domain.UserDetailsKeycloak
import phoenix.punters.domain.UserPreferences
import phoenix.punters.domain.Username
import phoenix.punters.domain.ValidPassword
import phoenix.punters.domain.Zipcode
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.support.UserGenerator.generatePersonalName
import phoenix.wallets.WalletsBoundedContextProtocol.AccountBalance
import phoenix.wallets.WalletsBoundedContextProtocol.Bet
import phoenix.wallets.WalletsBoundedContextProtocol.BlockedFunds
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.BetTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.PaymentTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod
import phoenix.wallets.domain.PaymentOperation.Deposit
import phoenix.wallets.domain.PaymentOperation.Withdrawal

object DataGenerator {

  val faker = new Faker()
  val clock: Clock = Clock.utcClock

  def randomString(length: Int = 64): String = Random.alphanumeric.take(length).mkString

  def randomNumber(minInclusive: Int, maxInclusive: Int): Int =
    minInclusive + Random.nextInt(maxInclusive - minInclusive + 1)

  def randomNonZeroNumeric(): LazyList[Char] = {
    def nextNonZeroNum: Char = {
      val chars = "123456789"
      randomElement(chars.toSeq)
    }

    LazyList.continually(nextNonZeroNum)
  }

  def randomAlphanumericLowerCase(): LazyList[Char] =
    Random.alphanumeric.filter(_.isLower)

  def randomNumber(minInclusive: Long, maxInclusive: Long): Long =
    ThreadLocalRandom.current().nextLong(minInclusive, maxInclusive + 1)

  def randomNumber(minInclusive: BigDecimal, maxInclusive: BigDecimal): BigDecimal =
    BigDecimal(ThreadLocalRandom.current().nextLong(minInclusive.longValue, maxInclusive.longValue + 1))

  def randomBoolean(): Boolean = Random.nextBoolean()

  def randomOffsetDateTime(): OffsetDateTime =
    randomNumber(Instant.EPOCH.toEpochMilli, 1610550674000L).toUtcOffsetDateTime

  def randomDuration(atLeast: FiniteDuration): FiniteDuration =
    FiniteDuration(randomNumber(atLeast.toMillis, 9999999999L), MILLISECONDS)

  def randomOption[A](valueIfDefined: => A): Option[A] = if (randomBoolean()) Some(valueIfDefined) else None

  def randomUUID(): UUID = UUID.randomUUID()

  val ActiveSportIds: Seq[String] = (1 to 1000).map("s" + _)

  val FilterableFixtureLifecycleStatuses: immutable.Seq[FixtureLifecycleStatus] =
    FixtureStatus.values.toList.flatMap(_.fixtureLifecycleStatusMappings.toList)

  val winnerMarketType: MarketType = MarketType.MatchWinner

  val nonWinnerMarketTypes: Seq[MarketType] = MarketType.values.filterNot(_ == winnerMarketType)

  def generateOdds(): Odds =
    Odds(BigDecimal(s"${faker.number().numberBetween(1, 99)}.${faker.number().numberBetween(1, 100)}"))

  def generateStake(): Stake =
    Stake.unsafe(
      DefaultCurrencyMoney(
        BigDecimal(s"${faker.number().numberBetween(1, 10000)}.${faker.number().numberBetween(0, 100)}")))

  def generateSportSummary(): SportSummary = SportSummary(generateSportId(), generateSportName())

  def generateSportId(): SportId = SportId(DataProvider.Phoenix, generateIdentifier())

  def generateSportName(): String = generateIdentifier()

  def generateFixtureSummary: FixtureSummary =
    FixtureSummary(generateFixtureId(), generateFixtureName(), randomOffsetDateTime(), generateFixtureLifecycleStatus)

  def generateFixtureId(): FixtureId = FixtureId(DataProvider.Oddin, generateIdentifier())

  def generateFixtureLifecycleStatus: FixtureLifecycleStatus = randomElement(FixtureLifecycleStatus.values)

  def generateFixtureName(): String = s"${faker.esports().team()} vs ${faker.esports().team()}"

  def generateMarketId(): MarketId = MarketId(DataProvider.Oddin, generateIdentifier())

  def generateSelectionId(): SelectionId = generateIdentifier()

  def generateBetId(): BetId = BetId(generateIdentifier())

  def generateReservationId(): ReservationId = ReservationId(generateIdentifier())

  def generateSelectionName(): String = faker.esports().player()

  def generateMarketName(): String = faker.funnyName().name()

  def generateWithdrawal(walletId: WalletId): Withdrawal =
    Withdrawal(walletId, generateRealMoney(), CreditCardPaymentMethod)

  def generateDeposit(walletId: WalletId): Deposit = Deposit(walletId, generateRealMoney(), CreditCardPaymentMethod)

  def generateRealMoney(): RealMoney = RealMoney(DefaultCurrencyMoney(faker.number().numberBetween(0, 100)))

  def generateBetData(): BetData =
    BetData(
      punterId = generatePunterId(),
      marketId = generateMarketId(),
      selectionId = generateSelectionId(),
      stake = generateStake(),
      odds = generateOdds())

  def generateSport(displayToPunters: Boolean = true): Sport = {
    val id = generateSportId()
    val name = generateSportName()
    val abbreviation = name.substring(0, 2)

    Sport(id, name, abbreviation, displayToPunters)
  }

  def generateMarket(): Market = {
    val marketId = generateMarketId()
    val name = generateMarketName()
    val fixtureId = generateFixtureId()
    val marketType = randomMarketType()
    val selectionOdds = generateSequenceOfSelectionOdds()
    val specifiers = Seq.empty
    val statusHistory = NonEmptyList.one(generateMarketLifecycleChange())
    val createdAt = clock.currentOffsetDateTime()

    Market(marketId, name, fixtureId, marketType, None, selectionOdds, specifiers, statusHistory, createdAt, createdAt)
  }

  def generatePaymentMethod(): PaymentMethod =
    randomElement(
      List(
        PaymentMethod.CreditCardPaymentMethod,
        PaymentMethod.BankTransferPaymentMethod,
        PaymentMethod.CashWithdrawalPaymentMethod,
        PaymentMethod.CashDepositPaymentMethod,
        PaymentMethod.ChequeWithdrawalPaymentMethod))

  def generatePaymentTransaction(
      reason: TransactionReason.PaymentReason,
      currentBalance: AccountBalance,
      amount: MoneyAmount,
      timestamp: OffsetDateTime): PaymentTransaction =
    PaymentTransaction(
      transactionId = randomString(),
      reason = reason,
      amount = amount,
      paymentMethod = generatePaymentMethod(),
      previousBalance = currentBalance,
      timestamp = timestamp)

  def generateBetTransaction(
      reason: TransactionReason.BetReason,
      currentBalance: AccountBalance,
      amount: MoneyAmount,
      timestamp: OffsetDateTime): BetTransaction =
    BetTransaction(
      transactionId = randomString(),
      reason = reason,
      amount = amount,
      timestamp = timestamp,
      previousBalance = currentBalance,
      bet = Bet(generateBetId(), RealMoney(amount), Odds(2)))

  def generateAccountBalance(
      available: MoneyAmount,
      blockedForBets: MoneyAmount = MoneyAmount.zero.get,
      blockedForWithdrawals: MoneyAmount = MoneyAmount.zero.get): AccountBalance =
    AccountBalance(
      available = available,
      blocked = BlockedFunds(blockedForBets = blockedForBets, blockedForWithdrawals = blockedForWithdrawals))

  def generateInitializedMarket(
      lifecycle: MarketLifecycle = Bettable(DataSupplierStatusChange),
      selection: SelectionOdds = generateSelectionOdds()): InitializedMarket = {
    val marketInfo =
      MarketInfo(generateMarketName(), generateFixtureId(), randomMarketType(), None, Seq.empty)
    InitializedMarket(generateMarketId(), marketInfo, lifecycle, Seq(selection))
  }

  def generateMarketAggregate(lifecycle: MarketLifecycle = Bettable(DataSupplierStatusChange)): MarketAggregate =
    MarketAggregate(
      generateMarketId(),
      generateMarketName(),
      generateSportSummary(),
      generateTournamentSummary(),
      generateFixtureSummary,
      lifecycle,
      selections = List(generateSelectionOdds()))

  def generateBetDataForMarketState(market: InitializedMarket): BetData =
    generateBetData().copy(
      marketId = market.id,
      selectionId = market.marketSelections.toSeq.head.selectionId,
      odds = market.marketSelections.toSeq.head.odds.get)

  def generateBetDataForMarketSelection(market: MarketAggregate): BetData =
    generateBetData().copy(
      marketId = market.id,
      selectionId = market.selections.head.selectionId,
      odds = market.selections.head.odds.get)

  def generateMarketLifecycleChange(): MarketLifecycleChange = {
    val updatedAt = clock.currentOffsetDateTime()
    MarketLifecycleChange(Bettable(DataSupplierStatusChange), updatedAt)
  }

  def generateFixture(): MarketsBoundedContext.Fixture = {
    val fixtureId = generateFixtureId()
    val name = generateFixtureName()
    val tournamentId = generateTournamentId()
    val startTime = clock.currentOffsetDateTime()
    val competitors = generateMarketCompetitorsForTwoWayMarket()
    val scoreHistory = Seq.empty
    val currentStatus = randomFixtureLifecycleStatus()
    val statusHistory = Seq.empty
    val finishTime = None
    val createdAt = clock.currentOffsetDateTime()

    MarketsBoundedContext.Fixture(
      fixtureId,
      name,
      tournamentId,
      startTime,
      competitors,
      scoreHistory,
      currentStatus,
      statusHistory,
      finishTime,
      createdAt)
  }

  def generateSportFixture(): Fixture = {
    val sportId = generateSportId()
    val tournamentId = generateTournamentId()
    val fixtureId = generateFixtureId()
    val name = generateFixtureName()
    val startTime = clock.currentOffsetDateTime().plusDays(10)
    val currentScore = generateFixtureScore()
    val fixtureLifecycleStatus = randomFixtureLifecycleStatus()
    val competitors = generateFixtureCompetitorsForTwoWayMarket()

    Fixture(sportId, tournamentId, fixtureId, name, startTime, currentScore, fixtureLifecycleStatus, competitors)
  }

  def generateMarketRequest(fixtureId: FixtureId = generateFixtureId()): UpdateMarketRequest = {
    val correlationId = generateIdentifier()
    val receivedAtUtc = clock.currentOffsetDateTime()
    val marketId = generateMarketId()
    val marketName = generateMarketName()
    val marketType = randomMarketType()
    val marketLifecycle = MarketLifecycle.NotBettable(DataSupplierStatusChange)
    val marketSpecifiers = Seq.empty
    val selections = Seq.empty

    UpdateMarketRequest(
      correlationId,
      receivedAtUtc,
      fixtureId,
      marketId,
      marketName,
      Some(MarketCategory(randomString(10))),
      marketType,
      marketLifecycle,
      marketSpecifiers,
      selections)
  }

  def generateTournamentId(): TournamentId = TournamentId(DataProvider.Oddin, generateIdentifier())

  def generateTournamentName(): String = faker.esports().league()

  def generateTournamentSummary(): TournamentSummary =
    TournamentSummary(generateTournamentId(), generateTournamentName())

  def generateTournament(): Tournament = {
    val tournamentId = generateTournamentId()
    val sportId = generateSportId()
    val name = generateTournamentName()
    val startTime = generateDateTime()

    Tournament(tournamentId = tournamentId, sportId = sportId, name = name, startTime = startTime)
  }

  def generateDateTime(): OffsetDateTime = clock.currentOffsetDateTime().plusDays(faker.number().numberBetween(1, 10))

  def generateFixtureRequest(
      sportId: SportId = generateSportId(),
      tournamentId: TournamentId = generateTournamentId(),
      fixtureId: FixtureId = generateFixtureId()): UpdateFixtureRequest = {
    val correlationId = generateIdentifier()
    val receivedAtUtc = clock.currentOffsetDateTime()
    val sportName = generateSportName()
    val sportAbbreviation = sportName.substring(0, 2)
    val tournamentName = generateTournamentName()
    val tournamentStartTime = clock.currentOffsetDateTime().plusDays(1)
    val fixtureName = generateFixtureName()
    val startTime = clock.currentOffsetDateTime().plusDays(2)
    val competitors = generateFixtureCompetitorsForTwoWayMarket()
    val currentScore = Some(generateFixtureScore())
    val fixtureStatus = randomFixtureLifecycleStatus()

    UpdateFixtureRequest(
      correlationId,
      receivedAtUtc,
      sportId,
      sportName,
      sportAbbreviation,
      tournamentId,
      tournamentName,
      tournamentStartTime,
      fixtureId,
      fixtureName,
      startTime,
      competitors,
      currentScore,
      fixtureStatus)
  }

  def generateFixtureDetails(): FixtureDetails = {
    val sportId = generateSportId()
    val sportName = generateSportName()
    val sportAbbreviation = sportName.substring(0, 2)
    val tournamentId = generateTournamentId()
    val tournamentName = generateTournamentName()
    val tournamentStartTime = clock.currentOffsetDateTime().plusDays(1)
    val fixtureId = generateFixtureId()
    val fixtureName = generateFixtureName()
    val startTime = clock.currentOffsetDateTime().plusDays(2)
    val competitors = generateFixtureCompetitorsForTwoWayMarket()
    val currentScore = generateFixtureScore()
    val fixtureStatus = randomFixtureLifecycleStatus()

    FixtureDetails(
      sportId,
      sportName,
      sportAbbreviation,
      tournamentId,
      tournamentName,
      tournamentStartTime,
      fixtureId,
      fixtureName,
      startTime,
      competitors,
      currentScore,
      fixtureStatus)
  }

  def generateMatchStatusUpdateRequest(
      sportId: SportId = generateSportId(),
      fixtureId: FixtureId = generateFixtureId(),
      matchPhase: FixtureLifecycleStatus): UpdateMatchStatusRequest =
    UpdateMatchStatusRequest(
      correlationId = generateIdentifier(),
      receivedAtUtc = clock.currentOffsetDateTime(),
      sportId = sportId,
      score = Some(MatchScore(faker.number().numberBetween(0, 10), faker.number().numberBetween(0, 5))),
      fixtureId = fixtureId,
      matchPhase = matchPhase)

  def randomEnumValue[E <: EnumEntry]()(implicit anEnum: Enum[E]): E = {
    randomElement(anEnum.values)
  }

  def randomFixtureLifecycleStatus(): FixtureLifecycleStatus = randomEnumValue[FixtureLifecycleStatus]()

  def generateFixtureScore(): FixtureScore = {
    val home = faker.number().numberBetween(0, 10)
    val away = faker.number().numberBetween(0, 5)

    FixtureScore(home, away)
  }

  def generateSportRequest(
      sportId: SportId = generateSportId(),
      displayToPunters: Option[Boolean] = Some(true)): UpdateSportRequest = {
    val correlationId = generateIdentifier()
    val receivedAtUtc = clock.currentOffsetDateTime()
    val sportName = faker.esports().game()
    val sportAbbreviation = sportName.substring(0, 2)

    UpdateSportRequest(correlationId, receivedAtUtc, sportId, sportName, sportAbbreviation, displayToPunters)
  }

  def generateFixtureCompetitorsForTwoWayMarket(): Set[sports.Competitor] =
    Set(generateFixtureCompetitor("home"), generateFixtureCompetitor("away"))

  def generateFixtureCompetitor(qualifier: String): sports.Competitor = {
    val competitorId = generateIdentifier()
    val name = faker.name().fullName()

    sports.Competitor(CompetitorId(DataProvider.Oddin, competitorId), name, qualifier)
  }

  def generateMarketCompetitorsForTwoWayMarket(): Seq[MarketsBoundedContext.Competitor] =
    Seq(generateMarketCompetitor("home"), generateMarketCompetitor("away"))

  def generateMarketCompetitor(qualifier: String): MarketsBoundedContext.Competitor = {
    val competitorId = generateIdentifier()
    val name = faker.name().fullName()

    MarketsBoundedContext.Competitor(CompetitorId(DataProvider.Oddin, competitorId), name, qualifier)
  }

  def generateIdentifier(): String = UUID.randomUUID().toString

  def randomMarketType(): MarketType = randomEnumValue[MarketType]()

  def randomNonWinnerMarketType(): MarketType = randomElement(nonWinnerMarketTypes)

  def randomElement[A](elems: Seq[A]): A = {
    val index = faker.number().numberBetween(0, elems.size)
    elems(index)
  }

  def generateSelectionOdds(odds: Odds = generateOdds()): SelectionOdds = {
    val selectionId = generateSelectionId()
    val selectionName = generateSelectionName()
    val active = faker.random().nextBoolean()

    SelectionOdds(selectionId, selectionName, Some(odds), active)
  }

  def generateSequenceOfSelectionOdds(): Seq[SelectionOdds] = {
    val count = faker.number().numberBetween(1, 6)
    (0 until count).map { _ => generateSelectionOdds() }
  }

  def generateBoolean(): Boolean = faker.bool().bool()

  def generateMoneyAmount(minimumAmountInclusive: Int = 0, maximumAmountExclusive: Int = 100000): MoneyAmount =
    MoneyAmount(BigDecimal(
      s"${faker.number().numberBetween(minimumAmountInclusive, maximumAmountExclusive)}.${faker.number().numberBetween(0, 100)}"))

  def generateGeolocation(): Geolocation = Geolocation(generateIdentifier())

  def generateCoolOffDuration(): FiniteDuration = FiniteDuration(faker.number().numberBetween(1, 90), DAYS)

  def generatePunterSummaries(count: Int): Seq[PunterSummary] =
    for (_ <- 0 to count) yield {
      generatePunterSummary()
    }

  def generatePunterSummary(): PunterSummary = {
    val id = generatePunterId()
    val username = UserGenerator.generateUsername()
    val firstName = generatePersonalName().firstName
    val lastName = generatePersonalName().lastName
    val email = UserGenerator.generateEmail()
    val dateOfBirth = UserGenerator.generateDateOfBirth()

    PunterSummary(id, username, firstName, lastName, email, dateOfBirth, isTestAccount = false)
  }

  def randomUserDetails(): UserDetails =
    UserDetails(
      userName = randomUsername(),
      name = randomName(),
      email = randomEmail(),
      phoneNumber = randomMobilePhoneNumber(),
      address = randomAddress(),
      dateOfBirth = randomDateOfBirth(),
      gender = Some(randomGender()),
      ssn = randomSocialSecurityNumber(),
      twoFactorAuthEnabled = randomBoolean(),
      userPreferences = randomUserPreferences(),
      termsAgreement = randomTermsAgreement(),
      signUpDate = randomOffsetDateTime(),
      isRegistrationVerified = randomBoolean(),
      isPhoneNumberVerified = randomBoolean(),
      isEmailVerified = randomBoolean())

  def randomUserDetailsKeycloak(): UserDetailsKeycloak =
    UserDetailsKeycloak(userName = randomUsername(), email = randomEmail(), isEmailVerified = false)

  def randomUsername(): Username = Username.fromStringUnsafe(randomString().toLowerCase())

  def randomName(): PersonalName =
    PersonalName(
      title = Title(randomString(3)).unsafe(),
      firstName = FirstName(randomString()).unsafe(),
      lastName = LastName(randomString()).unsafe())

  def randomEmail(): Email = Email.fromString(s"${UUID.randomUUID().toString}@test.com").toOption.get

  def randomGender(): Gender = {
    val fakeGender = faker.options().option("Male", "Female", "Other")
    Gender
      .fromString(fakeGender)
      .getOrElse(throw new RuntimeException(s"invalid gender format generated by Faker: $fakeGender"))
  }

  def randomMobilePhoneNumber(): MobilePhoneNumber =
    MobilePhoneNumber(s"+${LazyList.continually(randomNumber(0, 9)).take(11).mkString}")

  def randomAddress(): Address =
    Address(
      addressLine = AddressLine(s"${randomString()}, ${randomNonZeroNumeric().take(2).mkString}").unsafe(),
      city = City(randomString()).unsafe(),
      state = State(randomString()).unsafe(),
      zipcode = Zipcode(randomString()).unsafe(),
      country = Country(randomCountry()).unsafe())

  def randomCountry(): String = {
    val codes: Array[String] = Locale.getISOCountries()
    faker.options().nextElement(codes)
  }

  def randomDateOfBirth(): DateOfBirth =
    DateOfBirth(day = randomNumber(1, 28), month = randomNumber(1, 12), year = randomNumber(1950, 2000))

  def randomSocialSecurityNumber(): Last4DigitsOfSSN = Last4DigitsOfSSN.fromString(faker.number().digits(4)).unsafe()

  def randomUserPreferences(): UserPreferences =
    UserPreferences(
      CommunicationPreferences(
        announcements = randomBoolean(),
        promotions = randomBoolean(),
        subscriptionUpdates = randomBoolean(),
        signInNotifications = randomBoolean()),
      BettingPreferences(autoAcceptBetterOdds = randomBoolean()))

  def randomTermsAcceptedVersion(): TermsAcceptedVersion = TermsAcceptedVersion(randomNumber(0, 99))

  def randomTermsAgreement(): TermsAgreement =
    domain.TermsAgreement(randomTermsAcceptedVersion(), acceptedAt = randomOffsetDateTime())

  def randomMaybeValidPassword(): MaybeValidPassword = MaybeValidPassword(randomString())

  private val lowerCase = new CharacterRule(EnglishCharacterData.LowerCase)
  private val upperCase = new CharacterRule(EnglishCharacterData.UpperCase)
  private val digits = new CharacterRule(EnglishCharacterData.Digit)
  private val special = new CharacterRule(EnglishCharacterData.Special)
  private val passwordGenerator = new PasswordGenerator

  def randomValidPassword(): ValidPassword =
    ValidPassword(passwordGenerator.generatePassword(20, lowerCase, upperCase, digits, special))

  def randomSignInTimestamp(): SignInTimestamp = SignInTimestamp(randomOffsetDateTime())

  def createPhoenixAppBaseUrl(): PhoenixAppBaseUrl = PhoenixAppBaseUrl(faker.internet().url())
  def createTalonAppBaseUrl(): TalonAppBaseUrl = TalonAppBaseUrl(faker.internet().url())
}
