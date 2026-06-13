import styled from "styled-components";
import { OpenChatButton } from "../../open-chat-button";

export const StyledOpenChatButton = styled(OpenChatButton)`
  margin-top: ${(props) => props.theme.baseGutter}px;
  margin-bottom: ${(props) => props.theme.baseGutter}px;
`;
