package SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1;

import java.util.Optional;
import net.flipsports.gmx.dataapi.internal.common.core.Mapping;

public enum OperationTypeEnum {

    MobileApplePayDeposit(12771),
    MobileCreditCardDeposit(5116),
    MobileVerifiedCreditCardDeposit(5117),
    MobileCreditCardWithdrawal(5118);

    private final Integer id;

    public Integer getId() {
        return id;
    }

    OperationTypeEnum(Integer id) {
        this.id = id;
    }

    private static Mapping<Integer, OperationTypeEnum> idMapping = new Mapping<>(OperationTypeEnum.values(), OperationTypeEnum::getId);

    public static Optional<OperationTypeEnum> find(Integer value) {
        return idMapping.find(value);
    }

    public static OperationTypeEnum get(Integer value) {
        return idMapping.get(value);
    }
}
