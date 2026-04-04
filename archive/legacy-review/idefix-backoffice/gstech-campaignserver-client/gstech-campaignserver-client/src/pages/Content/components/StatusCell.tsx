import * as React from "react";
import capitalize from "lodash/capitalize";

import { Label } from "../../../components";

interface IProps {
  value: "published" | "draft";
}

const StatusCell: React.FC<IProps> = ({ value }) => (
  <Label color={value === "published" ? "green" : "orange"}>{capitalize(value)}</Label>
);

export { StatusCell };
