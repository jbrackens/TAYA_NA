import React, { useEffect, useState } from "react";
import { Form, Input, Select } from "antd";
import { useTranslation } from "i18n";
import { composeOptions } from "../../../../components/fixtures/utils/resolvers";
import FormModal, { FormValues } from "../../../../components/form/modal";
import { useDispatch } from "react-redux";
import { useSpy, Method, SpyCallbackProps } from "@phoenix-ui/utils";
import { useApi } from "../../../../services/api/api-service";
import {
  postFixtureDetailsUpdate,
  postFixtureDetailsUpdateSucceeded,
} from "../../../../lib/slices/fixturesDetailsSlice";
import { TalonFixture } from "../../../../types/fixture";

const { Option } = Select;

export type FixturesDetailsUpdateProps = {
  data: TalonFixture;
  visible: boolean;
  onClose: Function;
  onComplete?: Function;
};

const FixturesDetailsUpdate: React.FC<FixturesDetailsUpdateProps> = ({
  data,
  visible,
  onClose,
  onComplete,
}: FixturesDetailsUpdateProps) => {
  const { fixtureId } = data;
  const { t } = useTranslation(["common", "page-fixtures-details"]);
  const [submitForm, setSubmitForm] = useState(false);
  const [formData, setFormData] = useState<FormValues>();
  const dispatch = useDispatch();
  const { spy } = useSpy();

  const [triggerFixturesDetailsUpdateApi, loading] = useApi(
    "admin/fixtures/:id",
    Method.POST,
    postFixtureDetailsUpdateSucceeded,
  );

  useEffect((): any => {
    if (submitForm) {
      const putMarketSelection = async () => {
        try {
          !onComplete && dispatch(postFixtureDetailsUpdate());
          await triggerFixturesDetailsUpdateApi(formData, { id: fixtureId });
          setSubmitForm(false);
        } catch (err) {
          console.error({ err });
        }
      };
      putMarketSelection();
    }
  }, [submitForm]);

  const onFinish = (values: FormValues): void => {
    setFormData(values);
    setSubmitForm(true);
  };

  const onTransactionFinish = ({ prevValues, values }: SpyCallbackProps) => {
    if (!values && prevValues) {
      onClose();
      setSubmitForm(false);
    }
  };

  spy(loading, onTransactionFinish);

  return (
    <FormModal
      title={t("page-fixtures-details:UPDATE_MODAL_HEADER")}
      name="marketData"
      visible={visible}
      loading={loading}
      onSubmit={onFinish}
      onCancel={onClose}
      labels={{
        submit: t("common:UPDATE"),
      }}
      initialValues={{
        fixtureName: data?.fixtureName,
        status: data?.status,
      }}
    >
      <Form.Item
        label={t("page-fixtures-details:UPDATE_MODAL_FORM_NAME")}
        name="fixtureName"
        rules={[
          {
            required: true,
            message: t("page-fixtures-details:UPDATE_MODAL_FORM_NAME_ERROR"),
          },
        ]}
      >
        <Input disabled={loading} />
      </Form.Item>
      <Form.Item
        label={t("page-fixtures-details:UPDATE_MODAL_FORM_STATUS")}
        name="status"
        rules={[
          {
            required: true,
            message: t("page-fixtures-details:UPDATE_MODAL_FORM_STATUS_ERROR"),
          },
        ]}
      >
        <Select disabled={loading}>
          {composeOptions(t, "page-fixtures-details:STATUS").map(
            ({ text, value }) => (
              <Option key={`status-${value}`} value={value}>
                {text}
              </Option>
            ),
          )}
        </Select>
      </Form.Item>
    </FormModal>
  );
};

export default FixturesDetailsUpdate;
