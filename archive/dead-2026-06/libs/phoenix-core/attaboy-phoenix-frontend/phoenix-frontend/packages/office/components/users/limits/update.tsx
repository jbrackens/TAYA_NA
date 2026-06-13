import React, { useState } from "react";
import { useTranslation } from "i18n";
import FormModal from "../../form/modal";
import { FormValues } from "../../form/modal";
import {
  TalonPunterLimits,
  TalonPunterLimitsTypesEnum,
} from "../../../types/punters.d";
import PageHeader from "../../layout/page-header";
import UsersDetailsLimitsSectionSwitch from "./section/switch";
import UsersDetailsLimitsSection from "./section";
import { numberToHours, hoursToNumber, useSpy } from "@phoenix-ui/utils";

export type UsersDetailsLimitsUpdateProps = {
  data: TalonPunterLimits;
  visible: boolean;
  loading: boolean;
  onSubmit: Function;
  onClose: Function;
};

const UsersDetailsLimitsUpdate: React.FC<UsersDetailsLimitsUpdateProps> = ({
  data,
  visible,
  loading,
  onSubmit,
  onClose,
}: UsersDetailsLimitsUpdateProps) => {
  const { t } = useTranslation(["common", "page-users-details"]);
  const [editables, setEditables] = useState<any>({});
  const { spy } = useSpy();

  const initializeValues = (values: TalonPunterLimits): TalonPunterLimits => ({
    deposits: values.deposits || {},
    stake: values.stake || {},
    session: values.session || {},
  });

  const onFinish = (values: FormValues): void => {
    onSubmit(
      Object.keys(editables)
        .filter((key: string) => editables[key])
        .reduce(
          (prev, curr) => ({
            ...prev,
            [curr]: values[curr],
          }),
          {},
        ),
    );
  };

  spy(visible, ({ values, prevValues }) => {
    if (!prevValues && values) {
      setEditables({});
    }
  });

  const onSectionUpdate = (
    key: TalonPunterLimitsTypesEnum,
    value: boolean,
  ): void =>
    setEditables({
      ...editables,
      [key]: value,
    });

  return (
    <FormModal
      title={t("page-users-details:MODAL_LIMITS_HEADER")}
      name="limits"
      visible={visible}
      loading={loading}
      onSubmit={onFinish}
      onCancel={onClose}
      labels={{
        submit: t("common:UPDATE"),
      }}
      initialValues={initializeValues(data)}
    >
      <PageHeader
        title={t("page-users-details:HEADER_CARD_LIMITS_DEPOSIT")}
        subTitle={
          <UsersDetailsLimitsSectionSwitch
            value={editables.deposits}
            onChange={(value: boolean) =>
              onSectionUpdate(TalonPunterLimitsTypesEnum.DEPOSITS, value)
            }
          />
        }
      />
      <UsersDetailsLimitsSection
        field="deposits"
        unit="$"
        disabled={loading || !editables.deposits}
      />
      <PageHeader
        title={t("page-users-details:HEADER_CARD_LIMITS_STAKE")}
        subTitle={
          <UsersDetailsLimitsSectionSwitch
            value={editables.stake}
            onChange={(value: boolean) =>
              onSectionUpdate(TalonPunterLimitsTypesEnum.STAKE, value)
            }
          />
        }
      />
      <UsersDetailsLimitsSection
        field="losses"
        unit="$"
        disabled={loading || !editables.stake}
      />
      <PageHeader
        title={t("page-users-details:HEADER_CARD_LIMITS_SESSION")}
        subTitle={
          <UsersDetailsLimitsSectionSwitch
            value={editables.session}
            onChange={(value: boolean) =>
              onSectionUpdate(TalonPunterLimitsTypesEnum.SESSION, value)
            }
          />
        }
      />
      <UsersDetailsLimitsSection
        field="session"
        unit="hour"
        unitAsPrefix={false}
        separator={" "}
        step={0.25}
        formatter={numberToHours}
        parser={hoursToNumber}
        disabled={loading || !editables.session}
      />
    </FormModal>
  );
};

export default UsersDetailsLimitsUpdate;
