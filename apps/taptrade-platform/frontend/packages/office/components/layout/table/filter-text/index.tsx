import { ChangeEvent, useState } from "react";
import { Space, DatePicker, Input, Button } from "antd";
import type { InputRef } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { get } from "lodash";
import { RefsCollection } from "../../../../lib/utils/filters";
import { useTranslation } from "i18n";
import dayjs, { Dayjs } from "dayjs";

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
    <div className="p-2">
      {!type || type === "string" ? (
        <Input
          className="mb-2 block w-[188px]"
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
          className="mb-[5px] flex"
        />
      )}

      <Space>
        <Button className="w-[90px]" onClick={handleReset} size="small">
          {t("TABLE_FILTER_RESET")}
        </Button>
        <Button
          className="w-[90px]"
          type="primary"
          onClick={handleSearch}
          icon={<SearchOutlined />}
          size="small"
        >
          {t("TABLE_FILTER_APPLY")}
        </Button>
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
    <SearchOutlined className={filtered ? "text-[#1890ff]" : undefined} />
  ),
});

export default TableFilterText;
