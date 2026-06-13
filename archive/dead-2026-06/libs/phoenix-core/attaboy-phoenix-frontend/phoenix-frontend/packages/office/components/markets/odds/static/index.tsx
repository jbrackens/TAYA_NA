import React, { useEffect, useState } from "react";
import { Form, InputNumber, Select, Switch, Input, Row, Col } from "antd";
import { useTranslation } from "i18n";
import { isArray } from "lodash";
import { FormValues } from "../../../form/modal";
import FormModal from "../../../form/modal";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useSpy, Method, Id, SpyCallbackProps } from "@phoenix-ui/utils";
import { useApi } from "../../../../services/api/api-service";
import {
  TalonSelectionOdd,
  TalonSelectionOddAlign,
} from "../../../../types/selections";
import {
  putMarketSelectionUpdate,
  putMarketSelectionUpdateSucceeded,
} from "../../../../lib/slices/marketsDetailsSlice";
import { useDispatch } from "react-redux";

const { Option } = Select;

export type MarketsSelectionsPlaceStaticProps = {
  marketId: Id;
  marketName?: string;
  multi?: boolean;
  selection: TalonSelectionOdd | TalonSelectionOdd[] | undefined;
  visible: boolean;
  onComplete?: Function;
  onClose: Function;
};

const MarketsSelectionsPlaceStatic: React.FC<MarketsSelectionsPlaceStaticProps> = ({
  marketId,
  marketName,
  multi,
  selection,
  visible,
  onComplete,
  onClose,
}: MarketsSelectionsPlaceStaticProps) => {
  const { t } = useTranslation(["common", "page-markets-details"]);
  const [formData, setFormData] = useState<FormValues>();
  const [submitForm, setSubmitForm] = useState(false);
  const dispatch = useDispatch();
  const { spy } = useSpy();

  const [triggerMarketsResultsApi, loading] = useApi(
    "admin/trading/markets/:id/result",
    Method.PUT,
    !onComplete ? putMarketSelectionUpdateSucceeded : undefined,
  );

  useEffect((): any => {
    if (submitForm) {
      const putMarketResultChange = async () => {
        try {
          const { selections: multiSelections, ...rest } = formData || {};
          const isMultiIdChange = multi && isArray(multiSelections);
          const selectionId = isMultiIdChange
            ? multiSelections.map(
                (item: TalonSelectionOddAlign) => item.selectionId || item,
              )
            : (selection as TalonSelectionOddAlign)?.selectionId;
          !onComplete && dispatch(putMarketSelectionUpdate());
          await triggerMarketsResultsApi(
            {
              selectionId,
              ...rest,
            },
            { id: marketId },
          );
          setSubmitForm(false);
        } catch (err) {
          console.error({ err });
        }
      };
      putMarketResultChange();
    }
  }, [submitForm]);

  const onCancel = () => {
    setSubmitForm(false);
    setFormData(undefined);
    onClose();
  };

  const onFinish = (values: FormValues): void => {
    setFormData(values);
    setSubmitForm(true);
  };

  const onTransactionFinish = ({ prevValues, values }: SpyCallbackProps) => {
    if (!values && prevValues) {
      onClose();
      onComplete && onComplete();
    }
  };

  const onFormChange = (values: FormValues) => {
    setFormData(values);
  };

  const composeSelectionsOptions = () =>
    isArray(selection)
      ? selection
          .map(
            ({
              selectionId,
              selectionName,
              displayOdds,
            }: TalonSelectionOdd) => {
              if (displayOdds) {
                return {
                  text: `${selectionName} - ${displayOdds.decimal}`,
                  value: selectionId,
                };
              }
            },
          )
          .filter(
            (el): el is { text: string; value: string } => el !== undefined,
          )
      : [];

  const initialValues = {
    odds: multi ? 0 : (selection as TalonSelectionOdd)?.displayOdds?.decimal,
    isStatic:
      multi && isArray(selection)
        ? selection
            .map((item: TalonSelectionOdd) => item.isStatic)
            .filter((v) => v).length > 0
        : (selection as TalonSelectionOdd)?.isStatic,
  };

  const title = isArray(selection)
    ? t("page-markets-details:SELECTION_MODAL_STATIC_MARKET_HEADER", {
        name: marketName,
      })
    : t("page-markets-details:SELECTION_MODAL_STATIC_HEADER", {
        name: (selection as TalonSelectionOdd)?.selectionName,
      });

  spy(loading, onTransactionFinish);

  return (
    <FormModal
      title={title}
      name="placeBet"
      visible={visible}
      loading={loading}
      onChange={onFormChange}
      onSubmit={onFinish}
      onCancel={onCancel}
      labels={{
        submit: multi
          ? t("common:AMEND")
          : t("page-markets-details:SELECTION_MODAL_ACTION_STATIC_SUBMIT"),
      }}
      initialValues={initialValues}
    >
      {multi && (
        <Form.Item
          label={t("page-markets-details:SELECTION_MODAL_FORM_SELECTIONS")}
          name="selections"
          rules={[
            {
              required: true,
              message: t(
                "page-markets-details:SELECTION_MODAL_FORM_SELECTIONS_ERROR",
              ),
            },
          ]}
        >
          <Select showSearch allowClear mode="multiple" disabled={loading}>
            {composeSelectionsOptions().map(({ text, value }) => (
              <Option key={`selection-${value}`} value={value}>
                {text}
              </Option>
            ))}
          </Select>
        </Form.Item>
      )}
      <Form.Item>
        <Input.Group>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={t("page-markets-details:SELECTION_MODAL_FORM_ODD")}
                name="odds"
                rules={[
                  {
                    required: true,
                    message: t(
                      "page-markets-details:SELECTION_MODAL_FORM_ODD_ERROR",
                    ),
                  },
                ]}
              >
                <InputNumber disabled={loading} min={0} step={0.01} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item
                label={t("page-markets-details:SELECTION_MODAL_FORM_STATIC")}
                name="isStatic"
              >
                <Switch
                  disabled={loading}
                  checkedChildren={<CheckOutlined />}
                  unCheckedChildren={<CloseOutlined />}
                  defaultChecked={formData?.isStatic}
                  checked={formData?.isStatic}
                />
              </Form.Item>
            </Col>
          </Row>
        </Input.Group>
      </Form.Item>
    </FormModal>
  );
};

export default MarketsSelectionsPlaceStatic;
