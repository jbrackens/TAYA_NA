import React from "react";
import {
  NameCol,
  ValueCol,
  ChangeCol,
  InfoRow,
  StyledDivider,
  ButtonCol,
} from "./index.styled";

type InfoRowComponentProps = {
  name: string;
  value: React.ReactNode;
  button?: React.ReactNode;
  change?: React.ReactNode;
  noDivider?: boolean;
};

const InfoRowComponent: React.FC<InfoRowComponentProps> = ({
  name,
  value,
  button,
  change,
  noDivider,
}) => {
  return (
    <>
      <InfoRow>
        <NameCol
          xxl={{ span: 5 }}
          xl={{ span: 6 }}
          lg={{ span: 5 }}
          md={{ span: 24 }}
          sm={{ span: 24 }}
          xs={{ span: 24 }}
        >
          {name}
        </NameCol>
        <ValueCol
          xxl={{ span: 11 }}
          xl={{ span: 9 }}
          lg={{ span: 10 }}
          md={{ span: 15 }}
          sm={{ span: 13 }}
          xs={{ span: 24 }}
        >
          {value}
        </ValueCol>
        <ButtonCol
          xxl={{ span: 6 }}
          xl={{ span: 5 }}
          lg={{ span: 5 }}
          md={{ span: 5 }}
          sm={{ span: 7 }}
          xs={{ span: 12 }}
        >
          {button}
        </ButtonCol>
        <ChangeCol
          span={3}
          xxl={{ span: 2 }}
          xl={{ span: 4 }}
          lg={{ span: 4 }}
          md={{ span: 4 }}
          sm={{ span: 4 }}
          xs={{ span: 12 }}
        >
          {change}
        </ChangeCol>
      </InfoRow>
      {noDivider ? <></> : <StyledDivider />}
    </>
  );
};

export { InfoRowComponent };
