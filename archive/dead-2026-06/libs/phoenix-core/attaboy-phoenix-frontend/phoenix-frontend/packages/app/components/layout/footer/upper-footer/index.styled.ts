import styled from "styled-components";
import { Divider, Col, Row, Layout } from "antd";

export const UpperFooter = styled(Layout.Footer)`
  background-color: ${(props) => props.theme.footer.mainFooterColor};
  text-align: center;
  padding: 0;
  padding-top: ${(props) => 6.8 * props.theme.baseGutter}px;
  width: calc(100% - 350px);
  @media (max-width: 1200px) {
    padding-top: ${(props) => 3.1 * props.theme.baseGutter}px;
    width: 100%;
  }
`;

type DynamicColProps = {
  $isForImage?: boolean;
  $height?: number;
  $marginBottom?: number;
};

export const DynamicCol = styled(Col)<DynamicColProps>`
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.footer.secondaryFooterfontColor};

  @media (max-width: 1200px) {
    text-align: ${(props) => (props.$isForImage ? "end" : "")};
    margin: ${(props) => (props.$isForImage ? "auto" : "")};
  }
  text-align: left;
  margin-bottom: ${(props) =>
    props.$marginBottom ? `${props.$marginBottom}px` : "0px"};
`;

export const DynamicRow = styled(Row)`
  @media (min-width: 1200px) {
    height: 100%;
  }
`;

export const MobileDivider = styled(Divider)`
  display: none;
  @media (max-width: 1200px) {
    background-color: ${(props) => props.theme.footer.mobileDividerColor};
    display: block;
  }
  margin-bottom: ${(props) => 1.6 * props.theme.baseGutter}px;
  margin-top: 0;
  margin-left: 0;
  margin-right: 0;
`;

export const MainLink = styled.div`
  font-size: ${(props) => 1.6 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.footer.secondaryFooterfontColor};
  opacity: 0.47;
  padding-bottom: ${(props) => 2.6 * props.theme.baseGutter}px;
  padding-left: ${(props) => 4.2 * props.theme.baseGutter}px;
`;

export const SecondaryLink = styled.div`
  padding-left: ${(props) => 4.2 * props.theme.baseGutter}px;
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  & > a {
    color: ${(props) => props.theme.footer.secondaryFooterfontColor};
    &:hover {
      color: ${(props) => props.theme.footer.linkHoverColor};
    }
  }
  padding-bottom: ${(props) => 2.6 * props.theme.baseGutter}px;
`;

export const LogosCol = styled(Col)`
  @media (min-width: 1200px) {
    text-align: left;
  }
  text-align: center;

  & > span {
    margin-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  }
`;

export const LogoContainer = styled.div`
  @media (min-width: 1200px) {
    display: none;
  }
`;

export const DesktopLogoContainer = styled.div`
  padding-left: ${(props) => 10.8 * props.theme.baseGutter}px;
  @media (max-width: 1200px) {
    display: none;
  }
`;

export const DesktopSizeRow = styled(Row)`
  @media (max-width: 1200px) {
    display: none;
  }
`;

export const DescContainer = styled.div`
  padding-left: ${(props) => 4.2 * props.theme.baseGutter}px;
  padding-right: ${(props) => 4.2 * props.theme.baseGutter}px;
`;

export const Desc = styled.div`
  padding-bottom: ${(props) => 2.6 * props.theme.baseGutter}px;
`;

export const RowPadding = styled(Row)`
  padding: ${(props) => 6.6 * props.theme.baseGutter}px;

  @media (max-width: 1200px) {
    padding: ${(props) => 1.2 * props.theme.baseGutter}px;
  }
`;

export const StyledLogoImage = styled.img`
  width: ${(props) => 6 * props.theme.baseGutter}px;
  margin-right: ${(props) => 4 * props.theme.baseGutter}px;
`;

export const PaymentMethodContainer = styled.div`
  margin-top: ${(props) => 1 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.footer.mainFooterfontColor};
  color: ${(props) => props.theme.footer.paymentColor};
  img {
    margin-left: ${(props) => 1 * props.theme.baseGutter}px;
  }

  div:last-child {
    font-stretch: normal;
    font-style: normal;
    color: ${(props) => props.theme.footer.secondaryFooterfontColor};
    opacity: 0.47;
  }
`;

export const PaymentMethodImagesContainer = styled.div`
  margin-top: ${(props) => 1.5 * props.theme.baseGutter}px;

  img {
    margin-right: ${(props) => 2 * props.theme.baseGutter}px;
    width: ${(props) => 4.5 * props.theme.baseGutter}px;
  }
`;
