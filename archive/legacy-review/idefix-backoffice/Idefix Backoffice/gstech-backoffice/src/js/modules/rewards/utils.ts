import moment from "moment-timezone";
import { ColumnProps } from "../../core/components/table";

const formatDate = (value: string) => (value ? moment(value).format("DD.MM.YYYY HH:mm") : "-");

export function getTableColumns(fields: any[]) {
  return fields.map(({ title, property, type }) => {
    const column = { label: title, name: property, align: "left", type: "text" };
    if (property === "useDate") {
      return {
        ...column,
        type: "custom",
        format: (value, item) =>
          value
            ? formatDate(value)
            : item.expires
            ? `${moment(item.expires) < moment() ? "Expired" : "Will expire"}: ${formatDate(item.expires)}`
            : "-",
      };
    } else if (type === "timestamp") {
      return { ...column, type: "date" };
    } else if (property === "externalId") {
      return {
        ...column,
        type: "text",
        style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      };
    } else {
      return column;
    }
  }) as ColumnProps[];
}
