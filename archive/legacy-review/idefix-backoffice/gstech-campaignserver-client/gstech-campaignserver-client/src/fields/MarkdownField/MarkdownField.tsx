import * as React from "react";
import { useField } from "formik";
import styled from "styled-components";
import cn from "classnames";

import { MarkdownEditor } from "../../components";

const StyledMarkdownEditor = styled.div`
  &.validation__error {
    textarea {
      border: 1px solid ${({ theme }) => theme.palette.red};
    }
  }
`;

interface IProps {
  name: string;
}

const MarkdownField: React.FC<IProps> = ({ name }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [{ value }, meta, { setValue, setTouched }] = useField(name);

  const handleChange = React.useCallback(
    (newValue: string) => {
      setValue(newValue);
    },
    [setValue]
  );

  return (
    <StyledMarkdownEditor
      className={cn({ validation__error: !!(meta.error && meta.touched) })}
      onBlur={() => setTouched(true)}
    >
      <MarkdownEditor value={value} onChange={handleChange} />
    </StyledMarkdownEditor>
  );
};

export { MarkdownField };
