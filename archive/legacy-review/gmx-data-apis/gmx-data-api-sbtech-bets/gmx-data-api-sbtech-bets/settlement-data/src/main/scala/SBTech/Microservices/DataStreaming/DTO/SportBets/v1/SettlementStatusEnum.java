package SBTech.Microservices.DataStreaming.DTO.SportBets.v1;

import java.util.*;
import java.util.stream.Collectors;
import net.flipsports.gmx.dataapi.internal.common.core.Mapping;

public enum SettlementStatusEnum {

    Opened(0),
    Lost(1),
    Won(2),
    Draw(3),
    Canceled(4),
    Waiting(5),
    Withdrawn(6),
    FirstPlace(7),
    SecondPlace(8),
    ThirdPlace(9),
    FourthPlace(10),
    FifthPlace(11),
    SixthPlace(12),
    Closed(13),
    PurchasePrepare(14),
    Declined(15),
    HalfLost(16),
    HalfWon(17),
    SeventhPlace(18),
    EigthPlace(19),
    NinthPlace(20),
    TenthPlace(21),
    EleventhPlace(22),
    TwelvePlace(23),
    ThirteenthPlace(24),
    FourteenthPlace(25),
    FifteenthPlace(26),
    SixteenthPlace(27),
    SeventeenthPlace(28),
    EighteenthPlace(29),
    NineteenthPlace(30),
    TwentiethPlace(31),
    CashOut(32);

    private int code;

    public int getCode() {
        return code;
    }

    SettlementStatusEnum(int value) {
        this.code = value;
    }

    private static Mapping<Integer, SettlementStatusEnum> idMapping = new Mapping<>(SettlementStatusEnum.values(), SettlementStatusEnum::getCode);

    public static SettlementStatusEnum resolve(Integer value) {
        return idMapping.get(value);
    }

    public static List<SettlementStatusEnum> NotSettledStatuses = Arrays.asList(Opened, Withdrawn, Declined, Draw, Canceled, Waiting);

    public static List<SettlementStatusEnum> SettledStatuses = Arrays.stream(values()).filter(SettlementStatusEnum::isSettled).collect(Collectors.toList());

    public static boolean isNotSettled(SettlementStatusEnum status) {
        return NotSettledStatuses.contains(status);
    }

    public static boolean isSettled(SettlementStatusEnum status) {
        return !isNotSettled(status);
    }

 }
