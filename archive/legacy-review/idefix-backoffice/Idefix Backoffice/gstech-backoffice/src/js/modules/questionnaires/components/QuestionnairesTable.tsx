import React, { ChangeEvent, useCallback } from "react";
import format from "date-fns/format";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import { Questionnaire } from "app/types";

import Table, { Column, ColumnProps, getCsvHeaders, getSearchByKeys } from "../../../core/components/table";
import useSearch from "../../../core/hooks/useSearch";
import Search from "../../../core/components/search";
import { DownloadCsvButton } from "../../../core/components/button";

const columns = [
  { label: "Key", name: "name", align: "left", type: "text" },
  { label: "Name", name: "description", align: "left", type: "text" },
  {
    label: "Status",
    name: "answeredAt",
    align: "left",
    type: "custom",
    format: (
      value: string,
      { answers, required }: { answers: { key: string; question: string; answer: string }[]; required: boolean },
    ) =>
      answers.length && value
        ? ` Answered at ${format(new Date(value), "dd.MM.yyyy HH:mm:ss")}`
        : required
        ? "Unanswered"
        : "Not needed",
  },
] as ColumnProps[];

const CSV_HEADERS = getCsvHeaders(columns);
const searchBy = getSearchByKeys<Questionnaire>(columns);

interface Props {
  items: Questionnaire[];
  isLoading: boolean;
  onOpenDialog: (answers: { key: string; question: string; answer: string }[], description: string) => void;
}

export default ({ items, isLoading, onOpenDialog }: Props) => {
  const { query, setQuery, results } = useSearch<Questionnaire>(searchBy, items);
  const isEmpty = items.length === 0;

  const handleSearchQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    [setQuery],
  );

  return (
    <Box>
      <Typography variant="subtitle2">Questionnaires</Typography>

      <Search
        value={query}
        onChange={handleSearchQuery}
        placeholder="Search by Key, Name"
        disabled={isEmpty}
        buttons={
          <DownloadCsvButton headers={CSV_HEADERS} data={results} disabled={isEmpty} fileName="questionnaires.csv" />
        }
      />

      <Table initialData={results} isLoading={isLoading} estimatedItemSize={65}>
        {columns.map(column => (
          <Column key={column.name} {...column} />
        ))}
        <Column
          label="Actions"
          name="actions"
          align="right"
          type="custom"
          format={(
            _value,
            {
              description,
              answers,
            }: { description: string; answers: { key: string; question: string; answer: string }[] },
          ) => {
            return answers.length && answers ? (
              <Button onClick={() => onOpenDialog(answers, description)} color="primary">
                Show answers
              </Button>
            ) : (
              ""
            );
          }}
        />
      </Table>
    </Box>
  );
};
