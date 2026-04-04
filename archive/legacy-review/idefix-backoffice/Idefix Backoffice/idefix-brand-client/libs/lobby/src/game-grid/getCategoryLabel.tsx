import * as React from "react";
import { FormattedMessage } from "react-intl";

const getCategoryLabel = (type: string): React.ReactNode => (
  <FormattedMessage id={`game.category.mobile.${type}`} />
);

export default getCategoryLabel;
