import React from "react";
import { Typography, Space, Button, Breadcrumb } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { PageHeaderWrap } from "./index.styled";

// AntD v5 removed `PageHeader` (and `antd/lib/page-header`). Local
// API-compatible replacement covering the props this office actually
// uses across its 14 call sites: title, subTitle, extra, onBack,
// backIcon, footer, breadcrumb, children. Unknown legacy props are
// ignored (no crash) rather than spread onto a DOM node.
export interface PageHeaderProps {
  title?: React.ReactNode;
  subTitle?: React.ReactNode;
  extra?: React.ReactNode;
  onBack?: () => void;
  backIcon?: React.ReactNode | boolean;
  footer?: React.ReactNode;
  breadcrumb?: { items?: { title: React.ReactNode }[] };
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subTitle,
  extra,
  onBack,
  backIcon,
  footer,
  breadcrumb,
  children,
  className,
  style,
}) => {
  const showBack = Boolean(onBack) && backIcon !== false;
  return (
    <PageHeaderWrap className={className} style={style}>
      {breadcrumb?.items?.length ? (
        <Breadcrumb items={breadcrumb.items} style={{ marginBottom: 8 }} />
      ) : null}
      <div className="ph-row">
        <Space align="center" size={12}>
          {showBack ? (
            <Button
              type="text"
              aria-label="Back"
              onClick={onBack}
              icon={<ArrowLeftOutlined />}
            />
          ) : null}
          {title ? (
            <Typography.Title level={4} style={{ margin: 0 }}>
              {title}
            </Typography.Title>
          ) : null}
          {subTitle ? (
            <Typography.Text type="secondary">{subTitle}</Typography.Text>
          ) : null}
        </Space>
        {extra ? <div className="ph-extra">{extra}</div> : null}
      </div>
      {children}
      {footer}
    </PageHeaderWrap>
  );
};

export default PageHeader;
