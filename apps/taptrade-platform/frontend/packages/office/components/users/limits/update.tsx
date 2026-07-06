import React, { useState } from "react";
import { useTranslation } from "i18n";
import FormModal from "../../form/modal";
import { FormValues } from "../../form/modal";
import {
  OfficePunterLimits,
  OfficePunterLimitsScope,
  OfficePunterLimitsTypesEnum,
} from "../../../types/punters";
import PageHeader from "../../layout/page-header";
import UsersDetailsLimitsSectionSwitch from "./section/switch";
import UsersDetailsLimitsSection from "./section";
import { numberToHours, hoursToNumber, useSpy } from "@taptrade-ui/utils";

export type UsersDetailsLimitsUpdateProps = {
  data: OfficePunterLimits;
  visible: boolean;
  loading: boolean;
  onSubmit: Function;
  onClose: Function;
};

type EditableLimitSection = "pointAdd" | "pointUse" | "session";

const UsersDetailsLimitsUpdate: React.FC<UsersDetailsLimitsUpdateProps> = ({
  data,
  visible,
  loading,
  onSubmit,
  onClose,
}: UsersDetailsLimitsUpdateProps) => {
  const { t } = useTranslation(["common", "page-users-details"]);
  const [editables, setEditables] = useState<
    Partial<Record<EditableLimitSection, boolean>>
  >({});
  const { spy } = useSpy();

  const initializeValues = (
    values: OfficePunterLimits,
  ): Record<string, OfficePunterLimitsScope | undefined> => ({
    pointAdd: values[OfficePunterLimitsTypesEnum.POINT_ADD] || undefined,
    pointUse: values[OfficePunterLimitsTypesEnum.POINT_USE] || undefined,
    session: values.session || undefined,
  });

  const onFinish = (values: FormValues): void => {
    const payload: Partial<OfficePunterLimits> = {};

    if (editables.pointAdd) {
      payload[OfficePunterLimitsTypesEnum.POINT_ADD] = values.pointAdd;
    }
    if (editables.pointUse) {
      payload[OfficePunterLimitsTypesEnum.POINT_USE] = values.pointUse;
    }
    if (editables.session) {
      payload[OfficePunterLimitsTypesEnum.SESSION] = values.session;
    }

    onSubmit(payload);
  };

  spy(visible, ({ values, prevValues }) => {
    if (!prevValues && values) {
      setEditables({});
    }
  });

  const onSectionUpdate = (key: EditableLimitSection, value: boolean): void =>
    setEditables({
      ...editables,
      [key]: value,
    });

  return (
    <FormModal
      title={t("page-users-details:MODAL_LIMITS_HEADER")}
      name="limits"
      open={visible}
      loading={loading}
      onSubmit={onFinish}
      onCancel={onClose}
      labels={{
        submit: t("common:UPDATE"),
      }}
      initialValues={initializeValues(data)}
    >
      <PageHeader
        title={t("page-users-details:HEADER_CARD_LIMITS_POINT_ADD")}
        subTitle={
          <UsersDetailsLimitsSectionSwitch
            value={Boolean(editables.pointAdd)}
            onChange={(value: boolean) => onSectionUpdate("pointAdd", value)}
          />
        }
      />
      <UsersDetailsLimitsSection
        field="pointAdd"
        unit="pts"
        unitAsPrefix={false}
        separator=" "
        disabled={loading || !editables.pointAdd}
      />
      <PageHeader
        title={t("page-users-details:HEADER_CARD_LIMITS_POINT_USE")}
        subTitle={
          <UsersDetailsLimitsSectionSwitch
            value={Boolean(editables.pointUse)}
            onChange={(value: boolean) => onSectionUpdate("pointUse", value)}
          />
        }
      />
      <UsersDetailsLimitsSection
        field="pointUse"
        unit="pts"
        unitAsPrefix={false}
        separator=" "
        disabled={loading || !editables.pointUse}
      />
      <PageHeader
        title={t("page-users-details:HEADER_CARD_LIMITS_SESSION")}
        subTitle={
          <UsersDetailsLimitsSectionSwitch
            value={Boolean(editables.session)}
            onChange={(value: boolean) => onSectionUpdate("session", value)}
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
