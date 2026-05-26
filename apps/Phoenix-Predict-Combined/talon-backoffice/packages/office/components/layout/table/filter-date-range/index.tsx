import { useState } from "react";
import { Space, DatePicker, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { RefsCollection } from "../../../../lib/utils/filters";
import { useTranslation } from "i18n";
import dayjs, { Dayjs } from "dayjs";

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

  const handleSinceChange = (
    _e: Dayjs | null,
    dateString: string | string[],
  ) => {
    const value = Array.isArray(dateString) ? dateString[0] : dateString;
    setSearchSinceValue(value);
  };

  const handleUntilChange = (
    _e: Dayjs | null,
    dateString: string | string[],
  ) => {
    const value = Array.isArray(dateString) ? dateString[0] : dateString;
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
    <div className="p-2">
      <DatePicker
        ref={(node) => {
          refs && refs.set(dataIndex, node);
        }}
        placeholder={t("TABLE_FILTER_FROM")}
        value={searchSinceValue ? dayjs(searchSinceValue) : undefined}
        onChange={handleSinceChange}
        className="mb-[5px] flex"
      />
      <DatePicker
        ref={(node) => {
          refs && refs.set(dataIndex, node);
        }}
        placeholder={t("TABLE_FILTER_TO")}
        value={searchUntilValue ? dayjs(searchUntilValue) : undefined}
        onChange={handleUntilChange}
        className="mb-[5px] flex"
      />

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
    <SearchOutlined className={filtered ? "text-[#1890ff]" : undefined} />
  ),
});

export default TableFilterDateRange;
