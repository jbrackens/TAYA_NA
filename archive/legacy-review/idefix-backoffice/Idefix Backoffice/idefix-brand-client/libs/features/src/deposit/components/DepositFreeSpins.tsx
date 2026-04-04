import { FreeSpin } from "@brandserver-client/types";
import { PlusIcon } from "@brandserver-client/icons";
import * as React from "react";
import styled from "styled-components";

interface Props {
  amount: number;
  freeSpins: FreeSpin[];
  setAmount: (limit: number) => void;
  separator?: boolean;
}

function getProgress(freeSpins: FreeSpin[], amount: number) {
  let progress = 0;

  freeSpins.forEach(({ limit }) => {
    if (amount >= limit) {
      progress += 1;
    }
  });

  return { progress };
}

const DepositFreeSpins: React.FC<Props> = ({
  amount,
  freeSpins,
  setAmount,
  separator
}) => {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const { progress } = getProgress(freeSpins, amount);

    if (freeSpins && freeSpins.length > 0) {
      if (amount < freeSpins[0].limit) {
        setProgress(0);
      } else {
        setProgress(progress);
      }
    }
  }, [amount]);

  const progressWidth = (100 / freeSpins.length) * progress;

  return (
    <StyledFreespins
      progressWidth={progressWidth === 100 ? "100%" : `calc(${progressWidth}%)`}
    >
      <div className="freespin__progress-bar">
        <div className="freespin__progress-bar--progress" />
      </div>
      <div className="freespin__list">
        {freeSpins.map((freeSpin, index) => (
          <React.Fragment key={index}>
            <div
              className="freespin__item"
              onClick={() => setAmount(freeSpin.limit)}
            >
              <p className="freespin__item-text">
                <span className="freespin__item-count">
                  {freeSpin.spincount}
                </span>
                {freeSpin.spintype}
              </p>
            </div>
            {separator && <PlusIcon className="freespin__item-icon" />}
          </React.Fragment>
        ))}
      </div>
    </StyledFreespins>
  );
};

const StyledFreespins = styled.div<{
  progressWidth: string;
}>`
  margin-top: 20px;
  margin-bottom: 16px;

  .freespin__progress-bar {
    width: 100%;
    height: 4px;
    background: ${({ theme }) => theme.palette.secondaryLightest};
    border-radius: 5px;
  }

  .freespin__progress-bar--progress {
    width: ${props => props.progressWidth};
    height: 100%;
    background: ${({ theme }) => theme.palette.accent};
    border-radius: 5px;
  }

  .freespin__list {
    display: flex;
    justify-content: space-around;
    margin-top: 16px;
  }

  .freespin__item {
    display: flex;
    cursor: pointer;
  }

  .freespin__item-text {
    display: flex;
    flex-direction: column;
    padding: 0;
    margin: 0;

    ${({ theme }) => theme.typography.text12};
    line-height: inherit;
  }

  .freespin__item-count {
    color: ${({ theme }) => theme.palette.accent};
    text-align: center;
    ${({ theme }) => theme.typography.text16Bold};
  }

  .freespin__item-icon {
    width: 12px;
    height: 12px;
    margin-top: 4px;
    fill: ${({ theme }) => theme.palette.accent};
    &:last-child {
      display: none;
    }
  }
`;

export { DepositFreeSpins };
