package SBTech.Microservices.DataStreaming.DTO.SportBets.v1;

import net.flipsports.gmx.dataapi.internal.common.core.Mapping;

public enum BetTypeEnum {

    SingleBets(1, "Single bets"),
    ComboBets(2, "Combo bets"),
    IfBets(3, "If-bets"),
    Teasers(4, "Teasers"),
    BuyPoints(5, "Buy points"),
    ExactScore(6, "Exact Score"),
    QABet(7, "QA Bet"),
    CasinoBet(8, "Casino Bet"),
    GameBet(9, "Game Bet"),
    PurchaseBet(10, "Purchase Bet"),
    Forecast(11, "Forecast"),
    Tricast(12, "Tricast"),
    SystemBet(13, "System bet"),
    VirtualSureBet(14, "Virtual Sure Bet"),
    VirtualQABet(15, "Virtual QA Bet"),
    VirtualComboBet(16, "Virtual Combo Bet"),
    VirtualSystemBet(17, "Virtual System Bet"),
    VirtualForecastBet(18, "Virtual Forecast Bet"),
    VirtualTricastBet(19, "Virtual Tricast Bet"),
    FirstFour(21, "First Four"),
    VirtualFirstFourBet(22, "Virtual First Four Bet"),
    CombinatorBet(23, "Combinator bet"),
    YourBet(24, "Your Bet"),
    PulseBet(25, "Pulse Bet"),
    ToteWin(26, "ToteWin"),
    TotePlace(27, "TotePlace"),
    ToteShow(28, "ToteShow"),
    ToteWinPlace(29, "ToteWinPlace"),
    ToteWinShow(30, "ToteWinShow"),
    ToteWinPlaceShow(31, "ToteWinPlaceShow"),
    TotePlaceShow(32, "TotePlaceShow"),
    ToteExacta(33, "ToteExacta"),
    ToteQuinella(34, "ToteQuinella"),
    ToteTrifecta(35, "ToteTrifecta"),
    ToteSuperfecta(36, "ToteSuperfecta"),
    TotePentafecta(37, "TotePentafecta"),
    ToteOmni(38, "ToteOmni"),
    ToteDailyDouble(39, "ToteDailyDouble"),
    TotePick3(40, "TotePick3"),
    TotePick4(41, "TotePick4"),
    TotePick5(42, "TotePick5"),
    TotePick6(43, "TotePick6"),
    TotePick7(44, "TotePick7"),
    TotePick8(45, "TotePick8"),
    TotePick9(46, "TotePick9"),
    TotePick10(47, "TotePick10"),
    ToteGrandSlam(48, "ToteGrandSlam");

    private Integer id;

    private String description;

    public Integer getId() {
        return id;
    }

    public String getDescription() {
        return description;
    }

    BetTypeEnum(Integer id, String description) {
        this.id = id;
        this.description = description;
    }

    private static Mapping<Integer, BetTypeEnum> idMapping = new Mapping<>(BetTypeEnum.values(), BetTypeEnum::getId);

    public static BetTypeEnum resolve(Integer value) {
        return idMapping.find(value).orElse(null);
    }
}
