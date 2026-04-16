import React, { useState, useEffect } from "react";
import { Form, InputNumber, Select } from "antd";
import { useTranslation } from "i18n";
import { find } from "lodash";
import { FormValues } from "../../form/modal";
import FormModal from "../../form/modal";
import { TalonMarket } from "../../../types/market.d";
import { TalonSelectionOdd } from "../../../types/selections";
import { useApi } from "../../../services/api/api-service";
import {
  Method,
  SpyCallbackProps,
  useSpy,
  DisplayOdds,
} from "@phoenix-ui/utils";
import { TalonPunterShort } from "../../../types/punters.d";

const { Option, OptGroup } = Select;

export type MarketsSelectionsPhoneBetProps = {
  fixtureName?: string;
  markets: TalonMarket[];
  visible: boolean;
  onComplete?: Function;
  onClose: Function;
};

type MarketsSelectionsBetsInitValues = {
  id: string;
  odds: DisplayOdds;
};

const MarketsSelectionsPhoneBet: React.FC<MarketsSelectionsPhoneBetProps> = ({
  fixtureName,
  markets,
  visible,
  onComplete,
  onClose,
}: MarketsSelectionsPhoneBetProps) => {
  const { t } = useTranslation(["common", "page-bets"]);
  const [formData, setFormData] = useState<FormValues>();
  const [submitForm, setSubmitForm] = useState(false);
  const [searchValue, setSearchValue] = useState<string>();
  const { spy } = useSpy();

  const onCancel = () => {
    setFormData(undefined);
    onClose();
  };

  const onFinish = (values: FormValues): void => {
    setFormData(values);
    setSubmitForm(true);
  };

  const [triggerPuntersSearchApi, loadingPunters, { data: punters }] = useApi(
    "admin/punters",
    Method.GET,
  );

  const [triggerPhoneBetApi, loading] = useApi(
    "admin/punters/:id/bets",
    Method.POST,
  );

  const getPunters = async ({ values }: SpyCallbackProps) => {
    try {
      await triggerPuntersSearchApi(null, {
        query: {
          filters: {
            fullName: values,
          },
        },
      });
    } catch (err) {
      console.error({ err });
    }
  };

  useEffect((): any => {
    if (submitForm) {
      const postPhoneBet = async () => {
        try {
          const { punter, ...selectionOdds } = formData || {};
          await triggerPhoneBetApi(
            {
              selectionOdds: Object.keys(selectionOdds)
                .filter((value: string) => value.includes("bet-"))
                .map((value: string) => {
                  const [
                    marketIdPrefixed,
                    selectionId,
                  ] = parseMarketSelectionId(value);
                  const odds = selectionOdds[value];
                  return {
                    marketId: marketIdPrefixed.replace("bet-", ""),
                    selectionId,
                    odds,
                  };
                }),
            },
            { id: punter },
          );
        } catch (err) {
          console.error({ err });
        }
        setSubmitForm(false);
      };
      postPhoneBet();
    }
  }, [submitForm]);

  const onTransactionFinish = ({ prevValues, values }: SpyCallbackProps) => {
    if (!values && prevValues) {
      onClose();
      onComplete && onComplete();
    }
  };

  const onFormChange = (values: FormValues) => {
    setFormData(values);
  };

  const onPunterSearch = (value: string) => {
    setSearchValue(value);
  };

  const parseMarketSelectionId = (value: string) => {
    if (value) {
      const [marketIdPrefixed, selectionIdPrefixed] = value.split("|");
      return [
        marketIdPrefixed.replace("marketId:", ""),
        selectionIdPrefixed.replace("selectionId:", ""),
      ];
    }
    return [];
  };

  const composeSelectionsOptions = () =>
    markets.map(({ marketId, marketName, selectionOdds }: TalonMarket) => {
      const options = selectionOdds
        .map(({ selectionId, selectionName, displayOdds }) => {
          if (displayOdds) {
            return {
              text: `${selectionName} - ${displayOdds.decimal}`,
              value: `marketId:${marketId}|selectionId:${selectionId}`,
            };
          }
        })
        .filter(
          (el): el is { text: string; value: string } => el !== undefined,
        );
      return {
        label: marketName,
        options,
      };
    });

  const composeSelectionsValues = (
    buildResult: (rowId: string, selection: TalonSelectionOdd) => {},
  ) => () =>
    formData?.selections?.map((value: string) => {
      const [marketId, selectiondId] = parseMarketSelectionId(value);
      const market = find(
        markets,
        (item: TalonMarket) => item.marketId === marketId,
      );
      const selection = find(
        market?.selectionOdds,
        (item: TalonSelectionOdd) => item.selectionId === selectiondId,
      );
      if (selection) {
        return buildResult(value, selection);
      }
      return null;
    });

  const renderSelectionsRows = (
    value: string,
    selection: TalonSelectionOdd,
  ) => (
    <Form.Item
      key={`bet-${value}`}
      label={`${selection?.selectionName} - ${t(
        "page-bets:BET_MODAL_FORM_ODD",
      )}`}
      name={`bet-${value}`}
      initialValue={selection?.displayOdds.decimal}
      rules={[
        {
          required: true,
          message: t("page-bets:BET_MODAL_FORM_ODD_ERROR"),
        },
      ]}
    >
      <InputNumber
        disabled={loading}
        min={selection?.displayOdds.decimal}
        step={0.01}
      />
    </Form.Item>
  );

  const parseSelectionsInitValues = (
    value: string,
    selection: TalonSelectionOdd,
  ): MarketsSelectionsBetsInitValues => ({
    id: value,
    odds: selection.displayOdds.decimal,
  });

  spy(searchValue, getPunters);
  spy(loading, onTransactionFinish);

  return (
    <FormModal
      title={t("page-bets:BET_MODAL_HEADER", { name: fixtureName })}
      name="placeBet"
      visible={visible}
      loading={loading}
      onChange={onFormChange}
      onSubmit={onFinish}
      onCancel={onCancel}
      labels={{
        submit: t("page-bets:BET_MODAL_ACTION_SUBMIT"),
      }}
      initialValues={composeSelectionsValues(parseSelectionsInitValues)()
        ?.filter((item: MarketsSelectionsBetsInitValues) => item)
        .reduce(
          (prev: FormValues, current: MarketsSelectionsBetsInitValues) => ({
            ...prev,
            [current.id]: current.odds,
          }),
          {},
        )}
    >
      <Form.Item
        label={t("page-bets:BET_MODAL_FORM_PUNTER")}
        name="punter"
        rules={[
          {
            required: true,
            message: t("page-bets:BET_MODAL_FORM_PUNTER_ERROR"),
          },
        ]}
      >
        <Select
          showSearch
          loading={loadingPunters}
          placeholder={t("common:INPUT_SEARCH_PLACEHOLDER")}
          defaultActiveFirstOption={false}
          showArrow={false}
          filterOption={false}
          onSearch={onPunterSearch}
          notFoundContent={null}
        >
          {punters?.data?.map((item: TalonPunterShort) => (
            <Option key={`punter-${item.id}`} value={item.id}>
              {item.firstName} {item.lastName}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        label={t("page-bets:BET_MODAL_FORM_SELECTIONS")}
        name="selections"
        rules={[
          {
            required: true,
            message: t("page-bets:BET_MODAL_FORM_SELECTIONS_ERROR"),
          },
        ]}
      >
        <Select showSearch allowClear mode="multiple" disabled={loading}>
          {composeSelectionsOptions().map(({ label, options }) => (
            <OptGroup key={`optGroup-${label}`} label={label}>
              {options.map(({ text, value }) => (
                <Option key={`selection-${value}`} value={value}>
                  {text}
                </Option>
              ))}
            </OptGroup>
          ))}
        </Select>
      </Form.Item>
      {composeSelectionsValues(renderSelectionsRows)()}
    </FormModal>
  );
};

export default MarketsSelectionsPhoneBet;
