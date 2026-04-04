import React, { FC, useContext } from "react";
import {
  Table,
  TableRow,
  TableHeader,
  TableCol,
  TableBody,
  Toggle,
  MergedButtonGroup,
  Button,
} from "ui";
import { UserIdContext } from "./../userIdContext";
import { useTranslation } from "next-export-i18n";
import { UserContentSection, CustomButton } from "../index.style";
import { CloseOutlined } from "@ant-design/icons";

type UserDataTypes = {
  userId: string;
  isEnabled: boolean;
  username: string;
  email: string;
};

type UserTableProps = {
  userData: Array<UserDataTypes>;
  accountModal?: (val: boolean, type: "password" | "email") => void;
  walletModal?: (val: boolean) => void;
  loading?: boolean;
  onDeleteUser: () => void;
  modifyUser?: (payload) => void;
  projectModal?: (val: boolean) => void;
  contextModal?: (val: boolean) => void;
};

const UserTable: FC<UserTableProps> = ({
  userData,
  accountModal,
  walletModal,
  loading = false,
  onDeleteUser,
  modifyUser,
  projectModal,
  contextModal,
}) => {
  const { t } = useTranslation();

  const { setCurrentUserId, setCurrentUserDetails } = useContext(UserIdContext);

  const userRows = userData.map((user) => (
    <TableRow key={user.userId}>
      <TableCol loading={loading}>{user.username}</TableCol>
      <TableCol loading={loading}>{user.email}</TableCol>
      <TableCol align="center" loading={loading}>
        <CustomButton
          buttonType="white-outline"
          compact
          onClick={() => {
            setCurrentUserId(user.userId);
            setCurrentUserDetails(user);
            projectModal(true);
          }}
        >
          {t("PROJECTS")}
        </CustomButton>
      </TableCol>
      <TableCol align="center" loading={loading}>
        <MergedButtonGroup>
          <CustomButton
            buttonType="white-outline"
            compact
            onClick={() => {
              setCurrentUserId(user.userId);
              setCurrentUserDetails(user);
              accountModal(true, "password");
            }}
          >
            {t("PASSWORD")}
          </CustomButton>
          <CustomButton
            buttonType="white-outline"
            compact
            onClick={() => {
              setCurrentUserId(user.userId);
              setCurrentUserDetails(user);
              accountModal(true, "email");
            }}
          >
            {t("EMAIL")}
          </CustomButton>
        </MergedButtonGroup>
      </TableCol>
      <TableCol align="center" loading={loading}>
        <MergedButtonGroup>
          <CustomButton
            buttonType="white-outline"
            compact
            onClick={() => {
              setCurrentUserId(user.userId);
              setCurrentUserDetails(user);
              contextModal(true);
            }}
          >
            {t("USER_CONTEXT")}
          </CustomButton>
          <CustomButton
            buttonType="white-outline"
            compact
            onClick={() => {
              setCurrentUserId(user.userId);
              setCurrentUserDetails(user);
              walletModal(true);
            }}
          >
            {t("WALLET")}
          </CustomButton>
        </MergedButtonGroup>
      </TableCol>
      <TableCol loading={loading}>
        <Toggle
          checked={user.isEnabled}
          onChange={(a) => {
            setCurrentUserId(user.userId);
            modifyUser({ isEnabled: !user.isEnabled });
          }}
        />
      </TableCol>
      <TableCol align="center">
        <Button
          compact
          buttonType="nobackground"
          icon={<CloseOutlined />}
          onClick={() => {
            setCurrentUserId(user.userId);
            setCurrentUserDetails(user);
            onDeleteUser();
          }}
        />
      </TableCol>
    </TableRow>
  ));

  return (
    <UserContentSection>
      <Table stripped>
        <TableHeader>
          <TableRow>
            <TableCol width={20}>{t("USERNAME")}</TableCol>
            <TableCol width={20}>{t("EMAIL")}</TableCol>
            <TableCol align="center">{t("PROJECTS")}</TableCol>
            <TableCol align="center">{t("ACCOUNT")}</TableCol>
            <TableCol align="center">{t("PROFILE")}</TableCol>
            <TableCol width={8}>{t("ENABLED")}</TableCol>
            <TableCol width={5} align="center"></TableCol>
          </TableRow>
        </TableHeader>
        <TableBody>{userRows}</TableBody>
      </Table>
    </UserContentSection>
  );
};

export default UserTable;
