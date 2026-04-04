import { FC, useState } from "react";
import { TransferButtonContainer, TransferBtns } from "../index.styled";

type TransferProps = {
  buttonClicked: (direction: string) => void;
  disableLeft?: boolean;
  disableRight?: boolean;
};

export const TransferButtons: FC<TransferProps> = ({
  buttonClicked,
  disableLeft,
  disableRight,
}) => {
  return (
    <TransferButtonContainer>
      <TransferBtns
        buttonType="white-outline"
        onClick={() => buttonClicked("right")}
        disabled={disableLeft ? true : false}
      >
        {">"}
      </TransferBtns>
      <TransferBtns
        buttonType="white-outline"
        onClick={() => buttonClicked("left")}
        disabled={disableRight ? true : false}
      >
        {"<"}
      </TransferBtns>
    </TransferButtonContainer>
  );
};
