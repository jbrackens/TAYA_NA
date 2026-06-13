import React from "react";
import { Form, Select, Input } from "antd";
import { useTranslation } from "i18n";
import { SelectionOdd, Id } from "@phoenix-ui/utils";
import FormModal from "../../../form/modal";
import { FormValues } from "../../../form/modal";

const { Option } = Select;
const { TextArea } = Input;

export type MarketLifecycleSettleModalProps = {
  data: SelectionOdd[];
  visible: boolean;
  loading: boolean;
  onSubmit: Function;
  onClose: Function;
};

export type MarketLifecycleSettlePayload = {
  winningSelectionId: Id;
  reason: string;
};

const MarketLifecycleSettleModal: React.FC<MarketLifecycleSettleModalProps> = ({
  data,
  visible,
  loading,
  onSubmit,
  onClose,
}: MarketLifecycleSettleModalProps) => {
  const { t } = useTranslation(["common", "page-markets-details"]);

  const onFinish = (values: FormValues): void => {
    onSubmit(values);
  };

  return (
    <FormModal
      title={t("page-markets-details:SETTLE_MODAL_HEADER")}
      name="marketSettle"
      visible={visible}
      loading={loading}
      onSubmit={onFinish}
      onCancel={onClose}
      labels={{
        submit: t("page-markets-details:SETTLE_MODAL_SUBMIT"),
      }}
      initialValues={{
        winningSelectionId: undefined,
      }}
    >
      <Form.Item
        label={t("page-markets-details:SETTLE_MODAL_SELECTION")}
        name="winningSelectionId"
        rules={[
          {
            required: true,
            message: t("page-markets-details:SETTLE_MODAL_SELECTION_ERROR"),
          },
        ]}
      >
        <Select
          showSearch
          loading={loading}
          placeholder={t("common:INPUT_SEARCH_PLACEHOLDER")}
          defaultActiveFirstOption={false}
          filterOption={false}
          notFoundContent={null}
          data-testid="selection-dropdown"
        >
          {data?.map((item: SelectionOdd) => (
            <Option
              key={`selection-${item.selectionId}`}
              value={item.selectionId}
            >
              {item.selectionName}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        label={t("page-markets-details:SETTLE_MODAL_REASON")}
        name="reason"
        rules={[
          {
            required: true,
            message: t("page-markets-details:SETTLE_MODAL_REASON_ERROR"),
          },
        ]}
      >
        <TextArea rows={3} />
      </Form.Item>
    </FormModal>
  );
};

export default MarketLifecycleSettleModal;
