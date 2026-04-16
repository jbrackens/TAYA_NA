import React, { FC, useEffect, useState } from "react";
import { Modal, Select, Spin } from "antd";
import { useTranslation } from "i18n";
import {
  MarketVisibility,
  MarketVisibilityEnum,
} from "../../../types/market.d";
import { ModalContent, StyledAlert } from "./index.styled";
import { useApi } from "../../../services/api/api-service";
import { Method } from "@phoenix-ui/utils";
import { useRouter } from "next/router";
import { MarketCategoriesTableData } from "../table";

type Props = {
  marketCategory?: MarketCategoriesTableData;
  clearSelectedMarketCategory: () => void;
  triggerTableApi: () => void;
};

export const ChangeVisibilityModal: FC<Props> = ({
  marketCategory,
  clearSelectedMarketCategory,
  triggerTableApi,
}) => {
  const { t } = useTranslation("page-market-categories");
  const router = useRouter();
  const { sport } = router.query;

  const [selectValue, setSelectValue] = useState(marketCategory?.visibility);
  const onCancel = () => clearSelectedMarketCategory();
  const [triggerApi, isLoading, response] = useApi(
    "admin/trading/markets/visibility/change",
    Method.POST,
  );

  useEffect(() => {
    setSelectValue(marketCategory?.visibility);
  }, [marketCategory]);

  useEffect(() => {
    if (response.succeeded) {
      triggerTableApi();
      clearSelectedMarketCategory();
    }
  }, [response.succeeded]);

  const onOk = () => {
    triggerApi({
      sportId: sport,
      marketCategory: marketCategory?.name,
      marketVisibility: selectValue,
    });
  };

  const { Option } = Select;

  const onSelect = (value: MarketVisibility) => {
    setSelectValue(value);
  };

  return (
    <Modal
      visible={!!marketCategory}
      onOk={onOk}
      onCancel={onCancel}
      title={t("MODAL_TITLE", { name: marketCategory?.name })}
      okText={t("CONFIRM")}
      okButtonProps={{ disabled: selectValue === marketCategory?.visibility }}
    >
      <Spin spinning={isLoading}>
        <ModalContent>{t("SELECT_VISIBILITY")}</ModalContent>
        <Select
          optionFilterProp="children"
          onSelect={onSelect}
          value={selectValue}
        >
          {!!marketCategory &&
            (
              (Object.keys(MarketVisibilityEnum) as Array<
                keyof typeof MarketVisibilityEnum
              >) || []
            ).map((key) => {
              return (
                <Option value={key} key={key}>
                  {key}
                </Option>
              );
            })}
        </Select>
        {response?.error?.payload.errors.map((error: { errorCode: string }) => (
          <StyledAlert
            key={error.errorCode}
            message={error.errorCode}
            type="error"
            showIcon
          />
        ))}
      </Spin>
    </Modal>
  );
};
