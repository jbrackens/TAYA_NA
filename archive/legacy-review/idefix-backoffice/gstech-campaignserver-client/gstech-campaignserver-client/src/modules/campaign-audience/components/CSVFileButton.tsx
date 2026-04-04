import * as React from "react";
import styled from "styled-components";
import { useDropzone, FileWithPath } from "react-dropzone";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { ApiServerError } from "app/types";

import { Button } from "../../../components";
import { Attach } from "../../../icons";

const StyledCSVRule = styled.div`
  display: flex;
`;

interface IProps {
  className?: string;
  onLoadFile: (fileName: string, formData: FormData) => void;
  disabled?: boolean;
}

const CSVFileButton: React.FC<IProps> = ({ onLoadFile, className, disabled }) => {
  const [loading, setLoading] = React.useState(false);

  const onDrop = React.useCallback(
    async (acceptedFiles: FileWithPath[]) => {
      const [file] = acceptedFiles;
      const formData = new FormData();
      formData.append(file.name, file);

      try {
        setLoading(true);
        await onLoadFile(file.name, formData);
        setLoading(false);
      } catch (err) {
        const error: AxiosError<ApiServerError> = err;

        if (error.response) {
          toast.error(error.response.data.error.message);
        } else {
          toast.error(error.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [onLoadFile, setLoading]
  );

  const options = {
    accept: ".csv",
    noDragEventsBubbling: true,
    multiple: false,
    useFsAccessApi: false,
    onDrop
  };

  const { getInputProps, open } = useDropzone(options);

  return (
    <StyledCSVRule className={className || ""}>
      <input {...getInputProps()} />
      <Button type="button" onClick={open} icon={<Attach />} disabled={loading || disabled}>
        {loading ? "Adding..." : "Add CSV-file"}
      </Button>
    </StyledCSVRule>
  );
};

export default CSVFileButton;
