import React, { FC, useState, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import { CmsPageOptions } from "@brandserver-client/types";

interface Props {
  children?: React.ReactElement;
  pageOptions: CmsPageOptions;
}

const CmsPageLayout: FC<Props> = ({ pageOptions, children }) => {
  const [formContainer, setFormContainer] =
    useState<NodeListOf<HTMLDivElement>>();

  useLayoutEffect(() => {
    const formContainer = document.querySelectorAll<HTMLDivElement>(
      "#registration-form, #registration-email, #deposit-form"
    );
    if (formContainer.length === 0) {
      const modalDialogHolder = document.querySelectorAll<HTMLDivElement>(
        ".main-page__modal-holder"
      );
      setFormContainer(modalDialogHolder);
    } else {
      setFormContainer(formContainer);
    }
  }, []);

  return (
    <>
      <div
        className="main-page__modal-holder"
        style={{ display: "none" }}
      ></div>
      <div
        className="main-page__lander"
        dangerouslySetInnerHTML={{
          __html: pageOptions.body
        }}
      />
      {formContainer &&
        [].slice.call(formContainer).map((c: HTMLDivElement) => {
          // Added additional property to hide deposit options in deposit form.
          if (
            c.id === "deposit-form" &&
            React.isValidElement(children) &&
            children.type !== "iframe"
          ) {
            const childrenWithProps = React.cloneElement(
              children as React.ReactElement,
              {
                showDepositOptions: false,
                className: "deposit-form__pay-and-play"
              }
            );

            return ReactDOM.createPortal(childrenWithProps, c);
          }
          return ReactDOM.createPortal(children, c);
        })}
    </>
  );
};

export { CmsPageLayout };
