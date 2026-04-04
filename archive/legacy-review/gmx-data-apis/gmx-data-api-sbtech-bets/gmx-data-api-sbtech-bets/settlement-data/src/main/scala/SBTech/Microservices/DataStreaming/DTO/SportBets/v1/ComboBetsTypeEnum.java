package SBTech.Microservices.DataStreaming.DTO.SportBets.v1;

import net.flipsports.gmx.dataapi.internal.common.core.Mapping;

public enum ComboBetsTypeEnum {

    Skip(0),
    SingleBet(1),
    DoubleBet(2),
    TrebleBet(3),
    FourFoldBet(4);

    private final Integer id;

    public Integer getId() {
        return id;
    }

    ComboBetsTypeEnum(Integer id) {
        this.id = id;
    }

    private static Mapping<Integer, ComboBetsTypeEnum> idMapping = new Mapping<>(ComboBetsTypeEnum.values(), ComboBetsTypeEnum::getId);

    public static ComboBetsTypeEnum resolve(Integer value) {
        return idMapping.find(value).orElse(null);
    }
}
