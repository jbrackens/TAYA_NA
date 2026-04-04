import React, { useEffect, useState } from "react";
import { Header, Button } from "ui";
import { useTranslation } from "next-export-i18n";
import { UserHeaderSection, StyledHeaderContainer } from "./../index.style";
import { PlusCircleOutlined } from "@ant-design/icons";

const Userheader = ({ createUser }) => {
  const { t } = useTranslation();
  return (
    <UserHeaderSection>
      <StyledHeaderContainer>
        <Header type="h3" size="small" customFontSize={24}>
          {t("USERS")}
        </Header>
      </StyledHeaderContainer>
      <Button icon={<PlusCircleOutlined />} onClick={() => createUser(true)}>
        {t("CREATE_USER")}
      </Button>
    </UserHeaderSection>
  );
};

export default Userheader;
