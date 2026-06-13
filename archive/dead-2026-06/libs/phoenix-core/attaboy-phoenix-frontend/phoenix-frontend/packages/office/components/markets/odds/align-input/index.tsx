import React, { useState, useEffect } from "react";
import { Button, Form, Space, Tooltip } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import InputPercentage from "../../../form/input-percentage";
import { InputPercentageInputValue } from "../../../form/input-percentage";
import {
  Button as ButtonEnum,
  Layout,
  Id,
  Method,
  useSpy,
  SpyCallbackProps,
} from "@phoenix-ui/utils";
import { alignByPercent } from "../../../../lib/utils/calculators";
import {
  putMarketSelectionUpdate,
  putMarketSelectionUpdateSucceeded,
} from "../../../../lib/slices/marketsDetailsSlice";
import { useApi } from "../../../../services/api/api-service";
import { useDispatch } from "react-redux";

export type MarketsSelectionsAlignProps = {
  marketId: Id;
  selectionId: Id;
  odds: number;
  disabled?: boolean;
  title?: string;
  onComplete?: Function;
};

const MarketsSelectionsAlign = ({
  marketId,
  selectionId,
  odds,
  disabled,
  title,
  onComplete,
}: MarketsSelectionsAlignProps) => {
  const [inputValue, setInputValue] = useState<InputPercentageInputValue>(
    undefined,
  );
  const [inputValueChanged, setInputValueChanged] = useState(false);
  const [submitForm, setSubmitForm] = useState(false);
  const dispatch = useDispatch();
  const { spy } = useSpy();

  const defaultValue = 0;

  const [triggerMarketsSelectionChangeApi, loading] = useApi(
    "admin/trading/markets/:id/result",
    Method.PUT,
    !onComplete ? putMarketSelectionUpdateSucceeded : undefined,
  );

  useEffect((): any => {
    if (submitForm) {
      const putMarketSelection = async () => {
        try {
          !onComplete && dispatch(putMarketSelectionUpdate());
          await triggerMarketsSelectionChangeApi(
            {
              selectionId,
              odds: alignByPercent(odds, inputValue),
            },
            { id: marketId },
          );
          setSubmitForm(false);
        } catch (err) {
          console.error({ err });
        }
      };
      putMarketSelection();
    }
  }, [submitForm]);

  const onChange = (value: InputPercentageInputValue) => {
    setInputValue(value);
    setInputValueChanged(true);
  };

  const onClick = () => {
    setSubmitForm(true);
  };

  const onOddsChanged = ({ prevValues, values }: SpyCallbackProps) => {
    if (prevValues !== values) {
      setInputValue(defaultValue);
      setInputValueChanged(false);
    }
  };

  const onTransactionFinish = ({ prevValues, values }: SpyCallbackProps) => {
    if (!values && prevValues) {
      onComplete && onComplete();
    }
  };

  spy(odds, onOddsChanged);
  spy(loading, onTransactionFinish);

  return (
    <Form>
      <Space align={Layout.Align.CENTER}>
        <InputPercentage
          size={Layout.Size.SMALL}
          min={-100}
          max={100}
          defaultValue={defaultValue}
          disabled={loading || disabled}
          value={inputValue as number | undefined}
          onChange={onChange}
        />
        <Tooltip title={title}>
          <Button
            size={Layout.Size.SMALL}
            type={ButtonEnum.Type.PRIMARY}
            shape={ButtonEnum.Shape.CIRCLE}
            disabled={!inputValueChanged || disabled}
            loading={loading}
            onClick={onClick}
            icon={!loading && <CheckOutlined />}
          />
        </Tooltip>
      </Space>
    </Form>
  );
};

export default MarketsSelectionsAlign;
