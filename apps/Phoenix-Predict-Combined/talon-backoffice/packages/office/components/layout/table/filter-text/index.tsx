import { ChangeEvent, ComponentType, RefAttributes, useState } from "react";
import { Space, DatePicker } from "antd";
import type { InputProps, InputRef } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { get } from "lodash";
import { RefsCollection } from "../../../../lib/utils/filters";
import { useTranslation } from "i18n";
import { FilterInput as StyledFilterInput, FilterButton } from "./index.styled";
import dayjs, { Dayjs } from "dayjs";

// The styled wrapper drops AntD's `forwardRef`/ref typing (its base is cast to
// `ComponentType<ComponentProps<typeof Input>>` in the .styled file). Re-attach
// the Input ref attributes here so the callback ref type-checks against AntD's
// `InputRef` instead of styled-components' polymorphic string-ref overload.
const FilterInput = StyledFilterInput as unknown as ComponentType<
  InputProps & RefAttributes<InputRef>
>;

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

  const applyValue = (value: string) => {
    setSearchInputValue(value);
    setSelectedKeys([value]);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    applyValue(get(e, "target.value", ""));
  };

  const handleDateChange = (
    _date: Dayjs | null,
    dateString: string | string[],
  ) => {
    applyValue(Array.isArray(dateString) ? dateString[0] : dateString);
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
          ref={(node: InputRef | null) => {
            refs && refs.set(dataIndex, node);
          }}
          placeholder={t("TABLE_FILTER_INPUT_PLACEHOLDER", {
            key: label || dataIndex,
          })}
          value={searchInputValue}
          onChange={handleInputChange}
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
          value={searchInputValue ? dayjs(searchInputValue) : undefined}
          onChange={handleDateChange}
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
