import { FC, useState } from "react";
import { CheckboxHeader, Dropdown, DropdownContent } from "./../index.styled";
import { DownOutlined } from "@ant-design/icons";

type TransferCheckboxHeaderProps = {
  listLength: number | undefined;
  selectedLength: number | undefined;
  headerDropdownHandler: (type: string) => void;
  label?: string;
  loading?: boolean;
};

export const TransferCheckboxHeader: FC<TransferCheckboxHeaderProps> = ({
  listLength,
  selectedLength,
  headerDropdownHandler,
  label,
  loading = false,
}) => {
  const [displayDropdown, setDisplayDropdown] = useState(false);
  return (
    <CheckboxHeader>
      <div>
        {!loading && listLength && listLength > 0 ? (
          <Dropdown
            onMouseEnter={() => setDisplayDropdown(true)}
            onMouseLeave={() => setDisplayDropdown(false)}
          >
            <DownOutlined />
            <DropdownContent $show={displayDropdown}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setDisplayDropdown(false);
                  headerDropdownHandler(
                    selectedLength === listLength ? "all-false" : "all-true",
                  );
                }}
              >
                {selectedLength === listLength ? "Deselect all" : "Select all"}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setDisplayDropdown(false);
                  headerDropdownHandler("inverse");
                }}
              >
                Inverse selection
              </button>
            </DropdownContent>
          </Dropdown>
        ) : (
          <></>
        )}
        {`${
          selectedLength && selectedLength > 0 ? selectedLength + "/" : ""
        }${listLength} ${label}`}
      </div>
    </CheckboxHeader>
  );
};
