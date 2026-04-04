import React from "react";
import styled from "styled-components";
import { Breakpoints, useRegistry } from "@brandserver-client/ui";
import { useMessages } from "@brandserver-client/hooks";

const PEPFormStyled = styled.form`
  .pep__header {
    h1 {
      margin-top: 0;
      color: ${({ theme }) => theme.palette.primary};
      ${({ theme }) => theme.typography.text21Bold};
    }
    p {
      ${({ theme }) => theme.typography.text16};
      color: ${({ theme }) => theme.palette.primaryLight};
      margin-bottom: 0;
    }
  }

  .pep__loader-container {
    margin-top: 36px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-top: 24px;
      height: 100%;
    }
  }
  .pep__loader {
    align-self: center;
    width: 69px;
    height: 69px;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      width: 122px;
      height: 122px;
    }
  }
  .pep__action {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      flex-direction: column;
      justify-content: space-around;
      height: 186px;
    }
  }
  .pep__button {
    margin-top: 36px;
    max-width: 280px;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      max-width: 100%;
      margin-top: 24px;
    }
  }
  .pep__footer {
    color: ${({ theme }) => theme.palette.primaryLight};
    h4 {
      ${({ theme }) => theme.typography.text16Bold};
      margin-top: 24px;
      margin-bottom: 14px;
      &:first-child {
        margin-top: 30px;
      }
    }
    ul {
      ${({ theme }) => theme.typography.text16};
      margin-left: 15px;
      li {
        list-style-type: disc;
        margin-bottom: 8px;
      }
    }
  }
`;

interface Props {
  onSubmit: (id: string, data: Record<string, unknown>) => any;
}

const PEP: React.FC<Props> = ({ onSubmit }) => {
  const [active, setActive] = React.useState<boolean>(true);
  const { Button, Loader } = useRegistry();

  const handleSubmit = async (answer: string) => {
    setActive(false);

    try {
      const data = { pep: `${answer === "yes"}` };
      await onSubmit("PEP", data);
      setActive(true);
    } catch (err) {
      setActive(true);
    }
  };

  const messages = useMessages({
    pepHTML: "forms.pep",
    no: "forms.pep.option-no",
    yes: "forms.pep.option-yes",
    footerHTML: "forms.pep.footer"
  });

  return (
    <PEPFormStyled>
      <div
        className="pep__header"
        dangerouslySetInnerHTML={{ __html: messages.pepHTML }}
      />
      <div className="pep__action">
        {!active && (
          <div className="pep__loader-container">
            <Loader className="pep__loader" />
          </div>
        )}
        {active && (
          <>
            <Button
              color={Button.Color.accent}
              className="pep__button"
              onClick={() => handleSubmit("no")}
            >
              {messages.no}
            </Button>
            <Button
              color={Button.Color.accent}
              className="pep__button"
              onClick={() => handleSubmit("yes")}
            >
              {messages.yes}
            </Button>
          </>
        )}
      </div>
      <div
        className="pep__footer"
        dangerouslySetInnerHTML={{ __html: messages.footerHTML }}
      />
    </PEPFormStyled>
  );
};

export default PEP;
