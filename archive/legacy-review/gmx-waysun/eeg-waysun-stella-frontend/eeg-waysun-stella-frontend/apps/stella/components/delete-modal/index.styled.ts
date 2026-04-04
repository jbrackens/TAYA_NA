import styled from "styled-components";

export const DeleteModalheader = styled.div`
  font-size: 24px;
  margin-bottom: 40px;
`;

export const DeleteModalError = styled.div`
  color: ${(props) => props.theme.deleteModal.errorTextColor};
  margin: 10px 0;
  font-size: 11px;
`;
