import * as React from "react";
import styled from "styled-components";
import { useMessages } from "@brandserver-client/hooks";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";

const StyledTransferQuestioner = styled.div`
  .transferq__title {
    ${({ theme }) => theme.typography.text21Bold};
    color: ${({ theme }) => theme.palette.primary};
    margin-bottom: 14px;
  }

  .transferq__text,
  .transfeq__link {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.primaryLight};
  }

  .transfeq__link {
    cursor: pointer;
    text-decoration: underline;
  }

  .transferq__loader-container {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .transferq__loader {
    align-self: center;
    width: 49px;
    height: 49px;
  }

  .transferq__submit-button {
    width: 50%;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      width: 100%;
    }
  }
`;

interface Props {
  onSubmit: (id: string, data: Record<string, unknown>) => any;
}

const TransferQuestioner: React.FC<Props> = ({ onSubmit }) => {
  const [loading, setLoading] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const messages = useMessages({
    title: "forms.transfer.title",
    content1: "forms.transfer.content1",
    withdraw: "forms.transfer.withdraw",
    content2: "forms.transfer.content2",
    agree: "forms.transfer.agree",
    confirmation: "forms.transfer.confirmation",
    confirm: "forms.transfer.confirm",
    disagree: "forms.transger.disagree"
  });

  const { Button, Loader, SnackbarModal } = useRegistry();

  const handleSubmit = async (answer: string) => {
    setLoading(true);

    try {
      const data = { license_transfer: answer };
      await onSubmit("Transfer", data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleFalse = async () => {
    setShowModal(false);
    await handleSubmit("false");
  };

  return (
    <StyledTransferQuestioner>
      {showModal && (
        <SnackbarModal
          content={messages.confirmation}
          action={{
            actionTitle: messages.confirm,
            onActionClick: handleFalse
          }}
          close={{
            closeTitle: messages.disagree,
            onClose: () => setShowModal(false)
          }}
        />
      )}
      <div className="transferq__title">{messages.title}</div>
      <div>
        <span
          className="transferq__text"
          dangerouslySetInnerHTML={{ __html: messages.content1 }}
        />{" "}
        <span className="transfeq__link" onClick={() => setShowModal(true)}>
          {messages.withdraw}
        </span>{" "}
        <span
          className="transferq__text"
          dangerouslySetInnerHTML={{ __html: messages.content2 }}
        />
      </div>
      {loading ? (
        <div className="transferq__loader-container">
          <Loader className="transferq__loader" />
        </div>
      ) : (
        <Button
          className="transferq__submit-button"
          color={Button.Color.accent}
          size={Button.Size.medium}
          onClick={() => handleSubmit("true")}
        >
          {messages.agree}
        </Button>
      )}
    </StyledTransferQuestioner>
  );
};

export default TransferQuestioner;
