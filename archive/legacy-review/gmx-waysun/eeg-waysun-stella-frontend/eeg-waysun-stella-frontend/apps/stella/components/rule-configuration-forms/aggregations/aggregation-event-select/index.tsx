import React, { FC, useEffect, useState } from "react";
import { Select } from "ui";
import { EventGetResponseType } from "utils";
import { useApi } from "../../../../services/api-service";
import { getProjectId } from "./../../../../lib/slices/appDataSlice";
import { useSelector } from "react-redux";

type AggregationEventSelectProps = {
  onChange: any;
  value: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
};

export const AggregationEventSelect: FC<AggregationEventSelectProps> = ({
  onChange,
  value,
  error,
  disabled,
  loading = false,
}) => {
  const currentProjectId = useSelector(getProjectId);
  const getEvents: {
    data: EventGetResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
  } = useApi(`rule_configurator/admin/${currentProjectId}/events`, "GET");
  const [options, setOptions] = useState<Array<{ key: string; value: string }>>(
    [],
  );

  useEffect(() => {
    getEvents.triggerApi(undefined, {
      query: {
        include_inactive: true,
      },
    });
  }, []);

  useEffect(() => {
    if (getEvents.data) {
      setOptions(
        getEvents.data.details.map((eventData) => ({
          key: eventData.eventId,
          value: eventData.name,
        })),
      );
    }
  }, [getEvents.data]);

  return (
    <Select
      onOptionChange={(event) =>
        onChange(
          event,
          getEvents.data.details.find((el) => el.eventId === event),
        )
      }
      value={options.find((el) => el.key === value)?.value}
      selectedKey={value}
      options={options}
      error={error}
      fullWidth
      disabled={disabled}
      search
      loading={loading}
      addClearButton
      onOptionClear={() => onChange("", { fields: [] })}
    />
  );
};
