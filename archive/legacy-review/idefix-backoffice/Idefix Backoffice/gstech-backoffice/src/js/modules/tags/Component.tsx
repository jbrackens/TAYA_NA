import React from "react";
import TextField from "@material-ui/core/TextField";
import Autocomplete, { createFilterOptions } from "@material-ui/lab/Autocomplete";
import Chip from "@material-ui/core/Chip";
import lowerCase from "lodash/lowerCase";

const filter = createFilterOptions<string>();
const blockedCharacters = ["#", "/", "\\", "?", "%"];
const options = [
  "3rd-party-deposit",
  "affiliate",
  "all-payments",
  "anonymized",
  "bonus-hawk",
  "campaign-abuser",
  "check-history",
  "data-delete",
  "fraud",
  "incomplete-registration",
  "influencer",
  "kyc-pending",
  "name-changed",
  "pass-sow",
  "fail-sow",
  "payments-allow-all",
  "pep",
  "pep-scan",
  "sofort-chargeback",
  "streamer",
  "test-account",
  "partner",
  "chargebacks-received",
  "vip",
  "potential-vip",
  "custom-deal",
  "under-investigation",
  "bonus-hold",
];
const optionKeys = options.map(value => lowerCase(value));

interface Props {
  isLoading: boolean;
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export default ({ isLoading, tags = [], onAddTag, onRemoveTag }: Props) => {
  return (
    <Autocomplete
      multiple
      disabled={isLoading}
      value={tags}
      style={{ minWidth: 500 }}
      onChange={(event, newValue) => {
        // @ts-ignore
        if (event.key === "Backspace") return;

        const valueToAdd = newValue.pop();

        if (valueToAdd && optionKeys.includes(lowerCase(valueToAdd))) {
          const idx = optionKeys.indexOf(lowerCase(valueToAdd));
          onAddTag(options[idx]);
          return;
        }

        if (valueToAdd) onAddTag(valueToAdd);
      }}
      options={options}
      filterOptions={(opts, params) => {
        const filtered = filter(opts, params);

        const usedTags = filtered.filter(value => tags.includes(value));
        if (usedTags.length) {
          return filtered.filter(value => !usedTags.includes(value));
        }
        return filtered;
      }}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip label={option} {...getTagProps({ index })} onDelete={() => onRemoveTag(option)} />
        ))
      }
      renderInput={params => (
        <TextField
          {...params}
          variant="outlined"
          placeholder={isLoading ? "Loading..." : "Add tag"}
          onKeyDown={e => {
            if (blockedCharacters.includes(e.key)) e.preventDefault();
          }}
        />
      )}
    />
  );
};
