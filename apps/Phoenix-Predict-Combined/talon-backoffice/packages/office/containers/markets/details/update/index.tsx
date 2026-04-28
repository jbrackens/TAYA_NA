import React from "react";
import { Form, Input } from "antd";
import { useTranslation } from "i18n";
import { TalonSingleMarketFixture } from "../../../../types/market";
import FormModal from "../../../../components/form/modal";
import { FormValues } from "../../../../components/form/modal";

export type MarketsDetailsUpdateProps = {
  data: TalonSingleMarketFixture;
  visible: boolean;
  loading: boolean;
  onSubmit: Function;
  onClose: Function;
};

const MarketsDetailsUpdate: React.FC<MarketsDetailsUpdateProps> = ({
  data,
  visible,
  loading,
  onSubmit,
  onClose,
}: MarketsDetailsUpdateProps) => {
  const { t } = useTranslation(["common", "page-markets-details"]);

  const onFinish = (values: FormValues): void => {
    onSubmit(values);
  };

  return (
    <FormModal
      title={t("page-markets-details:UPDATE_MODAL_HEADER")}
      name="marketData"
      visible={visible}
      loading={loading}
      onSubmit={onFinish}
      onCancel={onClose}
      labels={{
        submit: t("common:UPDATE"),
      }}
      initialValues={{
        marketName: data?.marketName,
      }}
    >
      <Form.Item
        label={t("page-markets-details:UPDATE_MODAL_FORM_NAME")}
        name="marketName"
        rules={[
          {
            required: true,
            message: t("page-markets-details:UPDATE_MODAL_FORM_NAME_ERROR"),
          },
        ]}
      >
        <Input disabled={loading} />
      </Form.Item>
    </FormModal>
  );
};

export default MarketsDetailsUpdate;
