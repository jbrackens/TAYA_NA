import styled from "styled-components";
import { Input, MainList } from "ui";

export const ListContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.layout.listBackground};
`;

export const ListHeader = styled.div`
  display: flex;
  align-items: center;
  button {
    margin-left: auto;
    background-image: ${(props) => props.theme.mainSider.selected};
    border-radius: 4px;
    border: none;
    height: 40px;
    width: 40px;
    cursor: pointer;
  }
  margin-bottom: 10px;
  margin-right: 25px;
  padding: 15px 15px 15px 27px;
  background-color: ${(props) => props.theme.listSider.addBackground};
  border-radius: 10px;
`;

export const ListHeaderButtonDiv = styled.div`
  margin-left: auto;
  padding-left: 10px;
`;

export const EventsList = styled(MainList)`
  padding-right: 20px;
`;

export const SearchInput = styled(Input)`
  margin-bottom: 10px;
  margin-right: 25px;
`;

export const ListMessageSection = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: ${(props) => props.theme.listSider.customMessageFont};
`;
