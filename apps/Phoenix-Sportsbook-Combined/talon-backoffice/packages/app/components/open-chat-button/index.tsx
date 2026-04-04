import { useTranslation } from "i18n";
import { MessageOutlined } from "@ant-design/icons";
import { FC } from "react";
import { CoreButton } from "../ui/button";

type OpenChatButtonProps = {
  className?: string;
};

export const OpenChatButton: FC<OpenChatButtonProps> = ({ className }) => {
  const { t } = useTranslation(["open-chat-button"]);

  const openChat = () => {
    const elementToClick = document.getElementById("chatContainer")
      ?.children[0] as HTMLElement;
    elementToClick?.click();
  };

  return (
    <CoreButton
      icon={<MessageOutlined />}
      onClick={openChat}
      type="primary"
      className={className}
    >
      {t("OPEN_CHAT_BUTTON")}
    </CoreButton>
  );
};
