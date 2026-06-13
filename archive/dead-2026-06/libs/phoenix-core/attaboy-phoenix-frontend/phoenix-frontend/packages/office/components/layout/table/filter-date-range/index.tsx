import React, { useState } from "react";
import { Space, DatePicker } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { RefsCollection } from "../../../../lib/utils/filters";
import { useTranslation } from "i18n";
import { FilterButton } from "./index.styled";
import moment from "moment";

type TableFilterDateRangeProps = {
  dataIndex: string;
  refs?: RefsCollection;
  confirm: Function;
  setSelectedKeys: Function;
  clearFilters: Function;
  defaultSinceValue?: string;
  defaultUntilValue?: string;
  onClearFilter?: () => void;
};

const TableFilterDateRange = ({
  dataIndex,
  setSelectedKeys,
  confirm,
  refs,
  clearFilters,
  defaultSinceValue,
  defaultUntilValue,
  onClearFilter,
}: TableFilterDateRangeProps) => {
  const { t } = useTranslation("common");
  const [searchSinceValue, setSearchSinceValue] = useState(
    defaultSinceValue || "",
  );
  const [searchUntilValue, setSearchUntilValue] = useState(
    defaultUntilValue || "",
  );

  const handleSinceChange = (_e: any, dateString: string) => {
    const value = dateString;
    setSearchSinceValue(value);
  };

  const handleUntilChange = (_e: any, dateString: string) => {
    const value = dateString;
    setSearchUntilValue(value);
  };

  const handleSearch = () => {
    setSelectedKeys([{ since: searchSinceValue, until: searchUntilValue }]);
    if (!searchSinceValue && !searchUntilValue) {
      handleReset();
      return;
    }
    confirm();
  };

  const handleReset = () => {
    clearFilters();
    setSearchSinceValue("");
    setSearchUntilValue("");
    setSelectedKeys([{ since: "", until: "" }]);
    onClearFilter && onClearFilter();
  };

  return (
    <div style={{ padding: 8 }}>
      <DatePicker
        ref={(node) => {
          refs && refs.set(dataIndex, node);
        }}
        placeholder={t("TABLE_FILTER_FROM")}
        value={searchSinceValue ? moment(searchSinceValue) : undefined}
        onChange={handleSinceChange}
        style={{ display: "flex", marginBottom: "5px" }}
      />
      <DatePicker
        ref={(node) => {
          refs && refs.set(dataIndex, node);
        }}
        placeholder={t("TABLE_FILTER_TO")}
        value={searchUntilValue ? moment(searchUntilValue) : undefined}
        onChange={handleUntilChange}
        style={{ display: "flex", marginBottom: "5px" }}
      />

      <Space>
        <FilterButton onClick={handleReset} size="small">
          {t("TABLE_FILTER_RESET")}
        </FilterButton>
        <FilterButton
          type="primary"
          onClick={handleSearch}
          icon={<SearchOutlined />}
          size="small"
        >
          {t("TABLE_FILTER_APPLY")}
        </FilterButton>
      </Space>
    </div>
  );
};

TableFilterDateRange.getColumnSearchProps = (
  dataIndex: string,
  refs?: RefsCollection,
  label?: string,
  defaultSinceValue?: string,
  defaultUntilValue?: string,
  onClearFilter?: () => void,
) => ({
  filterDropdown: (props: any) => (
    <TableFilterDateRange
      {...props}
      dataIndex={dataIndex}
      label={label}
      refs={refs}
      defaultSinceValue={defaultSinceValue}
      defaultUntilValue={defaultUntilValue}
      onClearFilter={onClearFilter}
    />
  ),
  filterIcon: (filtered: boolean) => (
    <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
  ),
});

export default TableFilterDateRange;
