import styled from "styled-components";

export const NotEnoughMoneyErrorContainer = styled.div`
  color: ${(props) => props.theme.betslip.errors.notEnoughMoneyErrorColor};
  margin-top: ${(props) => 1.5 * props.theme.baseGutter}px;
  text-align: center;
  width: 100%;
`;

export const ListErrorContainer = styled.div`
  color: ${(props) => props.theme.betslip.errors.notEnoughMoneyErrorColor};
  width: 100%;
  text-align: center;
`;

export const MetaFlexContainer = styled.span`
  display: flex;
  font-size: ${(props) => 1.3 * props.theme.baseGutter}px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  text-transform: capitalize;
`;

export const OddsClose = styled.span`
  margin-left: auto;
`;
