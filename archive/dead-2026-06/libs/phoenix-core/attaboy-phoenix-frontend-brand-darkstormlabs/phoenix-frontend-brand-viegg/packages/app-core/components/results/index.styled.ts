import styled from "styled-components";
import { StatusEnum } from ".";

export const StyledResult = styled.div`
  height: 100vh;

  .ant-result {
    background-color: ${(props) => props.theme.result.backgroundColor};
    border-radius: 10px;
  }

  .ant-result-title {
    color: ${(props) => props.theme.result.titleColor};
    font-size: ${(props) => 2 * props.theme.baseGutter}px;
    font-weight: bold;
    font-stretch: normal;
    font-style: normal;
    line-height: 1.5;
    margin-bottom: ${(props) => 2 * props.theme.baseGutter}px;
  }

  .ant-result-subtitle {
    color: ${(props) => props.theme.result.subtitleColor};
  }

  .ant-result-extra {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
  }

  .ant-result-icon {
    display: flex;
    justify-content: center;
  }

  .ant-btn {
    :last-child {
      margin-top: ${(props) => 0.9 * props.theme.baseGutter}px;
      background-color: ${(props) =>
        props.theme.result.secondaryButtonBackgroundColor};
      color: ${(props) => props.theme.result.secondaryButtonColor};
      border: 1px solid
        ${(props) => props.theme.result.secondaryButtonBorderColor};

      :hover,
      :active,
      :focus {
        background-color: ${(props) =>
          props.theme.result.secondaryButtonHoverBackgroundColor};
        color: ${(props) => props.theme.result.secondaryButtonHoverColor};
        border: 1px solid
          ${(props) => props.theme.result.secondaryButtonHoverBorderColor};
      }
    }

    :first-child {
      margin-right: 0;
      background-color: ${(props) =>
        props.theme.result.primaryButtonBackgroundColor};
      color: ${(props) => props.theme.result.primaryButtonColor};
      border: 1px solid
        ${(props) => props.theme.result.primaryButtonBorderColor};

      :hover,
      :active,
      :focus {
        background-color: ${(props) =>
          props.theme.result.primaryButtonHoverBackgroundColor};
        color: ${(props) => props.theme.result.primaryButtonHoverColor};
        border: 1px solid
          ${(props) => props.theme.result.primaryButtonHoverBorderColor};
      }
    }
    border-radius: 5px;
    height: ${(props) => 6 * props.theme.baseGutter}px;
    width: ${(props) => 33 * props.theme.baseGutter}px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

type IconBackgroundProps = {
  backgroundColorType: any;
};

export const IconBackground = styled.div<IconBackgroundProps>`
  height: ${(props) => 7.7 * props.theme.baseGutter}px;
  width: ${(props) => 7.7 * props.theme.baseGutter}px;
  border-radius: 50%;
  background-color: ${(props) => {
    switch (props.backgroundColorType) {
      case StatusEnum.SUCCESS:
        return props.theme.result.successSvgBackgroundColor;
      case StatusEnum.ERROR:
        return props.theme.result.errorSvgBackgroundColor;
      case StatusEnum.INFO:
        return props.theme.result.infoSvgBackgroundColor;
      case StatusEnum.WARNING:
        return props.theme.result.warningSvgBackgroundColor;
      case StatusEnum.GEOCOMPLY:
        return props.theme.uiComponents.modals.geocomplyModal
          .headerIconBackgroundColor;
      default:
        return props.theme.result.infoSvgBackgroundColor;
    }
  }};
  position: relative;

  img {
    position: absolute;
    margin: auto;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
`;
