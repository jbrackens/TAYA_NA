import React from "react";
import { Typography, Space, Button, Breadcrumb } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

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
  // Legacy AntD PageHeader props still passed by some call sites; accepted
  // for type-compatibility but intentionally not rendered by this shim.
  tags?: React.ReactNode;
  avatar?: { src?: React.ReactNode };
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
    <div
      className={["mb-4 p-0", className].filter(Boolean).join(" ")}
      style={style}
    >
      {breadcrumb?.items?.length ? (
        <Breadcrumb items={breadcrumb.items} className="mb-2" />
      ) : null}
      <div className="flex items-center justify-between gap-4">
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
            <Typography.Title level={4} className="!m-0">
              {title}
            </Typography.Title>
          ) : null}
          {subTitle ? (
            <Typography.Text type="secondary">{subTitle}</Typography.Text>
          ) : null}
        </Space>
        {extra ? <div className="flex items-center gap-2">{extra}</div> : null}
      </div>
      {children}
      {footer}
    </div>
  );
};

export default PageHeader;
