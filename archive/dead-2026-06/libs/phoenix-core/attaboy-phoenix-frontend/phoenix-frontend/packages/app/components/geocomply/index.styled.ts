import styled from "styled-components";

export const VerticalDivider = styled.div`
  border-right: 1px solid
    ${(props) =>
      props.theme.uiComponents.modals.geocomplyModal
        .downloadButtonDividerColor};
  height: ${(props) => 4.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 2.3 * props.theme.baseGutter}px;
`;

export const DownloadButton = styled.div`
  height: ${(props) => 7.7 * props.theme.baseGutter}px;
  background-color: ${(props) =>
    props.theme.uiComponents.modals.geocomplyModal
      .downloadButtonBackgroundColor};
  color: ${(props) =>
    props.theme.uiComponents.modals.geocomplyModal.downloadButtonColor};
  border: 1px solid
    ${(props) =>
      props.theme.uiComponents.modals.geocomplyModal.downloadButtonBorderColor};
  display: flex;
  align-items: center;
  padding: ${(props) => 2.2 * props.theme.baseGutter}px;
  border-radius: 5px;
  max-width: ${(props) => 33 * props.theme.baseGutter}px;
  margin: auto;
  cursor: pointer;
  font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.4;
  letter-spacing: normal;

  :hover {
    background-color: ${(props) =>
      props.theme.uiComponents.modals.geocomplyModal
        .downloadButtonHoverBackgroundColor};
    color: ${(props) =>
      props.theme.uiComponents.modals.geocomplyModal.downloadButtonHoverColor};
    border: 1px solid
      ${(props) =>
        props.theme.uiComponents.modals.geocomplyModal
          .downloadButtonHoverBorderColor};
    ${VerticalDivider} {
      border-right: 1px solid
        ${(props) =>
          props.theme.uiComponents.modals.geocomplyModal
            .downloadButtonDividerHoverColor};
    }
  }

  :last-child {
    margin-top: ${(props) => 0.7 * props.theme.baseGutter}px;
  }

  img {
    height: ${(props) => 2.9 * props.theme.baseGutter}px;
    width: ${(props) => 2.9 * props.theme.baseGutter}px;
    margin-right: ${(props) => 2.3 * props.theme.baseGutter}px;
  }
`;
