import * as React from "react";
import { toast } from "react-toastify";
import { CSVDownload } from "react-csv";

import api from "../../api";
import { Download } from "../../icons";
import { Button } from "../Button";

interface Props {
  campaignId: number;
  type?: "email" | "sms";
  className?: string;
}

export const DownloadCSVButton: React.FC<Props> = ({ campaignId, type, className }) => {
  const [isLoading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<string | null>(null);

  const handleDownloadAudience = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.campaigns.downloadCsvAudience(campaignId, type);
      setLoading(false);
      if (typeof response.data === "string") {
        setData(response.data);
      }
      setData(null);
    } catch (err) {
      setLoading(false);
      if (err.response) {
        const errorMessage = err.response.data.error.message;
        return toast.error(errorMessage);
      }

      toast.error(err.message);
    }
  }, [campaignId, type]);

  return (
    <>
      <Button className={className || ""} icon={<Download />} onClick={handleDownloadAudience} disabled={isLoading}>
        {isLoading ? "Downloading..." : "Download CSV"}
      </Button>
      {data && <CSVDownload data={data} target="_blank" />}
    </>
  );
};
