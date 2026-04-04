import { CmsPageOptions } from "@brandserver-client/types";

export enum CmsTypes {
  RECEIVE_CMS_PAGE_OPTIONS = "cms/receive-cms-page-options",
  CHANGE_LOGIN_OPEN = "cms/change-login-open"
}

export type CmsActions = RECEIVE_CMS_PAGE_OPTIONS | CHANGE_LOGIN_OPEN;

export type RECEIVE_CMS_PAGE_OPTIONS = {
  type: CmsTypes.RECEIVE_CMS_PAGE_OPTIONS;
  payload: CmsPageOptions;
};

export type CHANGE_LOGIN_OPEN = {
  type: CmsTypes.CHANGE_LOGIN_OPEN;
  payload: boolean | undefined;
};
