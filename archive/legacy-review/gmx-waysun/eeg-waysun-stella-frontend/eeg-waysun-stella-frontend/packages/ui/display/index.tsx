import { FC } from "react";
import { DisplayLabel, DisplayContent } from "./index.styled";
import { LoaderInline } from "./..";

type DisplayProps = {
  label?: string;
  loading?: boolean;
};

export const Display: FC<DisplayProps> = ({ label, children, loading }) => {
  return (
    <div>
      {label && <DisplayLabel>{label}</DisplayLabel>}
      <DisplayContent>
        {loading && <LoaderInline />}
        {!loading && children}
      </DisplayContent>
    </div>
  );
};
