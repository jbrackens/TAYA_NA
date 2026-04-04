import * as React from "react";

interface IProps {
  value: { language: string; isFilled: boolean }[];
}

const ArrayCell: React.FC<IProps> = ({ value }) => {
  const data = value?.join(", ");

  return (
    <div>
      <p title={data}>{data}</p>
    </div>
  );
};

export { ArrayCell };
