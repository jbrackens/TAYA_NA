import { FC } from "react";
import {
  PaginationContainer,
  PageNumbers,
  PageNumbersContainer,
  Arrows,
  DotDiv,
} from "./index.styled";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";

type PaginationProps = {
  current?: number;
  last?: number;
  first?: number;
  onClick?: (page: number) => void;
  onNextClick?: () => void;
  onPrevClick?: () => void;
  fullWidth?: boolean;
  className?: string;
};

export const Pagination: FC<PaginationProps> = ({
  current = 0,
  last = 0,
  first = 0,
  onClick,
  onNextClick,
  onPrevClick,
  fullWidth = false,
  className,
}) => {
  const pages = () => {
    let pages = [];
    const displayNumber = current === first || current === last ? 2 : 1;
    for (let i = current - displayNumber; i <= current + displayNumber; i++) {
      i > first &&
        i < last &&
        pages.push(
          <PageNumbers
            current={i === current}
            onClick={() => onClick && onClick(i)}
            key={i}
          >
            <div>{i}</div>
          </PageNumbers>,
        );
    }
    return pages;
  };
  return (
    <PaginationContainer fullWidth={fullWidth} className={className}>
      <Arrows onClick={onPrevClick}>
        <LeftOutlined />
      </Arrows>
      <PageNumbersContainer fullWidth={fullWidth}>
        <PageNumbers
          current={current === first}
          onClick={() => onClick && onClick(first)}
        >
          <div>{first}</div>
        </PageNumbers>
        {first + 2 <= current - 1 && <DotDiv>...</DotDiv>}
        {pages()}
        {last - 2 >= current + 1 && <DotDiv>...</DotDiv>}
        {first !== last && (
          <PageNumbers
            current={current === last}
            onClick={() => onClick && onClick(last)}
          >
            <div>{last}</div>
          </PageNumbers>
        )}
      </PageNumbersContainer>
      <Arrows onClick={onNextClick}>
        <RightOutlined />
      </Arrows>
    </PaginationContainer>
  );
};
