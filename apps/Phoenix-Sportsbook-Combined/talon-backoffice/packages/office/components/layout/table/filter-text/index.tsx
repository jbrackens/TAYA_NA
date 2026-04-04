import React, { useState } from "react";
import { Space, DatePicker } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { get } from "lodash";
import { RefsCollection } from "../../../../lib/utils/filters";
import { useTranslation } from "i18n";
import { FilterInput, FilterButton } from "./index.styled";
import moment from "moment";

type TableFilterTextProps = {
  dataIndex: string;
  label?: string;
  refs?: RefsCollection;
  confirm: Function;
  setSelectedKeys: Function;
  clearFilters: Function;
  defaultValue?: string;
  type?: "date" | "string";
  confirmCall: (args: any) => void;
  selectedKeys: any;
  onClearFilter: () => void;
};

const TableFilterText = ({
  dataIndex,
  label,
  setSelectedKeys,
  confirm,
  refs,
  clearFilters,
  defaultValue,
  type,
  onClearFilter,
}: TableFilterTextProps) => {
  const { t } = useTranslation("common");
  const [searchInputValue, setSearchInputValue] = useState(defaultValue || "");

  const handleChange = (e: any, dateString?: string) => {
    const value = type === "date" ? dateString : get(e, "target.value", "");
    setSearchInputValue(value);
    setSelectedKeys([value]);
  };
  const handleSearch = () => {
    if (!searchInputValue) {
      handleReset();
      return;
    }
    confirm();
  };

  const handleReset = () => {
    clearFilters();
    setSearchInputValue("");
    onClearFilter();
  };

  return (
    <div style={{ padding: 8 }}>
      {!type || type === "string" ? (
        <FilterInput
          ref={(node) => {
            refs && refs.set(dataIndex, node);
          }}
          placeholder={t("TABLE_FILTER_INPUT_PLACEHOLDER", {
            key: label || dataIndex,
          })}
          value={searchInputValue}
          onChange={handleChange}
          onPressEnter={handleSearch}
        />
      ) : (
        <DatePicker
          ref={(node) => {
            refs && refs.set(dataIndex, node);
          }}
          placeholder={t("TABLE_FILTER_INPUT_PLACEHOLDER", {
            key: label || dataIndex,
          })}
          value={searchInputValue ? moment(searchInputValue) : undefined}
          onChange={handleChange}
          style={{ display: "flex", marginBottom: "5px" }}
        />
      )}

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

TableFilterText.getColumnSearchProps = (
  dataIndex: string,
  refs?: RefsCollection,
  label?: string,
  onClearFilter?: () => void,
  defaultValue?: string | number,
  type?: "date" | "string",
) => ({
  filterDropdown: (props: any) => (
    <TableFilterText
      {...props}
      dataIndex={dataIndex}
      label={label}
      refs={refs}
      onClearFilter={onClearFilter}
      defaultValue={defaultValue}
      type={type}
    />
  ),
  filterIcon: (filtered: boolean) => (
    <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
  ),
});

export default TableFilterText;
