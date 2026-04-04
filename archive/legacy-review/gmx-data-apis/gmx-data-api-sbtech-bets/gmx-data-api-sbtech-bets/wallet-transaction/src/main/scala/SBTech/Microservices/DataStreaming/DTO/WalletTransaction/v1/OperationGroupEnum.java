package SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1;

import java.util.Optional;
import net.flipsports.gmx.dataapi.internal.common.core.Mapping;

public enum OperationGroupEnum {

    ExternalDeposits(22),
    ExternalWithdrawals(23);

    private final Integer id;

    public Integer getId() {
        return id;
    }

    OperationGroupEnum(Integer id) {
        this.id = id;
    }

    private static Mapping<Integer, OperationGroupEnum> idMapping = new Mapping<>(OperationGroupEnum.values(), OperationGroupEnum::getId);

    public static Optional<OperationGroupEnum> find(Integer value) {
        return idMapping.find(value);
    }

    public static OperationGroupEnum get(Integer value) {
        return idMapping.get(value);
    }
}