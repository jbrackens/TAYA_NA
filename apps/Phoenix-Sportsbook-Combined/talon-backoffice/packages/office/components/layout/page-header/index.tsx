import React from "react";
import { PageHeaderProps } from "antd/lib/page-header";
import { PageHeaderStyled } from "./index.styled";

const PageHeader = (props: PageHeaderProps) => <PageHeaderStyled {...props} />;

export default PageHeader;
