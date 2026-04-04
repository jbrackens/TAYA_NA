import * as React from "react";
import { ApiServerError } from "app/types";
import { AxiosError } from "axios";
import styled from "styled-components";
import { toast } from "react-toastify";

import { Dropdown, TextArea, Button, TextInput } from "../../../components";

const StyledPasteCSV = styled.div`
  .dropdown-content {
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    width: 450px;

    & > :first-child {
      height: 250px;
    }

    & > :last-child {
      display: flex;
      margin-top: 8px;

      & > :last-child {
        margin-left: auto;
      }
    }
  }
`;

interface Props {
  onLoadFile: (fileName: string, formData: FormData) => void;
}

const PasteCSV = ({ onLoadFile }: Props) => {
  const [textAreaValue, setTextAreaValue] = React.useState<string>("");
  const [fileNameValue, setFileNameValue] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleChangeTextArea = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextAreaValue(e.target.value);
  }, []);

  const handleChangeFileName = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFileNameValue(e.target.value);
  }, []);

  const handleSubmit = React.useCallback(async () => {
    if (!textAreaValue || !fileNameValue) return;

    const blob = new Blob([textAreaValue], { type: "text/csv" });

    const formData = new FormData();
    formData.append(`${fileNameValue}.csv`, blob, `${fileNameValue}.csv`);

    try {
      setLoading(true);
      await onLoadFile(`${fileNameValue}.csv`, formData);
      setLoading(false);
      setTextAreaValue("");
      setFileNameValue("");
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
  }, [fileNameValue, onLoadFile, textAreaValue]);

  return (
    <StyledPasteCSV>
      <Dropdown title="Paste CSV" appearance="flat" autoClose={false}>
        <div className="dropdown-content">
          <TextArea placeholder="Paste here CVS list" onChange={handleChangeTextArea} value={textAreaValue} />
          <div>
            <TextInput value={fileNameValue} onChange={handleChangeFileName} placeholder="File name" />
            <Button onClick={handleSubmit} disabled={!textAreaValue || !fileNameValue || loading}>
              {loading ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </Dropdown>
    </StyledPasteCSV>
  );
};

export default PasteCSV;
