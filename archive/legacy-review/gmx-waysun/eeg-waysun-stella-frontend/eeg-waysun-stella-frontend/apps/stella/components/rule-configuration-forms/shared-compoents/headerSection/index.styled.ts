import styled from "styled-components";

export const ListSiderHeadingSection = styled.div`
  display: flex;
  padding: 15px 50px;
  align-items: center;
  border-bottom: 1px solid ${(props) => props.theme.layout.borderColor};
  h6 {
    line-height: 1.5;
    min-width: 235px;
  }
`;

export const ListSiderSelect = styled.div`
  width: 40%;
  margin-left: 30px;
`;
