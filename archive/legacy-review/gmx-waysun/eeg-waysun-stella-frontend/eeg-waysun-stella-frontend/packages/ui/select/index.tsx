import { FC, useState, useRef, useEffect, useMemo } from "react";
import {
  SelectWrapper,
  SelectHeader,
  Arrow,
  DropdownOptions,
  DropdownButton,
  DropdownEmpty,
  SelectError,
  HeaderSpan,
  SelectLabel,
  LoaderDiv,
  NonSearchSelectContainer,
  ClearInputButton,
} from "./index.styled";
import { Input, LoaderInline } from "./..";
import {
  SearchOutlined,
  DownOutlined,
  CloseOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

export type OptionType = {
  key: string;
  value: string;
};
type SelectProps = {
  options?: Array<OptionType> | any;
  onOptionChange?: (key: string | number, value: string) => void;
  onClick?: () => void;
  onInputChange?: (e: Event) => void;
  name?: string;
  value?: string;
  selectedKey?: string | number;
  initialText?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  labelText?: string;
  error?: string;
  compact?: boolean;
  className?: string;
  search?: boolean;
  filterOption?: (input: string, option: string | object) => void;
  loading?: boolean;
  loadingOptions?: boolean;
  addClearButton?: boolean;
  onOptionClear?: () => void;
  optionFullWidth?: boolean;
};

export const Select: FC<SelectProps> = ({
  options = [],
  onOptionChange,
  onInputChange,
  onClick,
  name,
  value,
  initialText,
  fullWidth = false,
  disabled,
  labelText,
  error,
  compact = false,
  className,
  search = false,
  filterOption,
  selectedKey,
  loading = false,
  loadingOptions = false,
  addClearButton = false,
  onOptionClear,
  optionFullWidth = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(-1);
  const [title, setTitle] = useState(search || !value ? "" : value);
  const [dropdownPosition, setDropdownPosition] = useState("bottom");
  const wrapperRef = useRef<any>(null);
  const optionsRef = useRef<any>(null);
  const selectedRef = useRef<any>(null);

  useEffect(() => {
    if (value !== undefined && selectedKey === undefined) {
      setTitle(value);
      setInputVal(value);
    }
  }, [value, options]);

  useEffect(() => {
    if (selectedKey !== undefined) {
      if (options[selectedKey] && typeof options[selectedKey] === "string") {
        setTitle(options[selectedKey]);
        setInputVal(options[selectedKey]);
      } else {
        let valueFromOp = options.find(
          (opItem: OptionType) => opItem.key === selectedKey,
        );
        valueFromOp ? setTitle(valueFromOp.value) : setTitle("");
        valueFromOp ? setInputVal(valueFromOp.value) : setInputVal("");
      }
    }
  }, [selectedKey, options]);

  useEffect(() => {
    initialText && setTitle(initialText);
  }, [initialText]);

  useEffect(() => {
    setKeyboardSelectedIndex(-1);
    const handleClickOutside = (event: any) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    } else {
      if (title !== inputVal) {
        setInputVal(title);
      }
    }
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    scroll();
  }, [keyboardSelectedIndex]);

  const optionClicked = (key: string | number, value: string) => {
    onOptionChange && onOptionChange(key, value);
    setTitle(value);
    setInputVal(value);
    setDropdownOpen(false);
    setKeyboardSelectedIndex(-1);
  };

  const dropdownClicked = (e: any) => {
    e.preventDefault();
    onClick && onClick();
    if (!dropdownOpen) {
      // Logic for opening the dropdown to top if near the bottom
      const rect = wrapperRef.current.getBoundingClientRect();
      const heightLeft = window.innerHeight - rect.bottom;
      heightLeft < 210
        ? setDropdownPosition("top")
        : setDropdownPosition("bottom");
    }
    setDropdownOpen(!dropdownOpen);
  };

  const filteredOption = useMemo(() => {
    if (search) {
      let filtered = [];
      filtered = options.filter((op: any) => {
        return filterOption
          ? filterOption(inputVal, op)
          : typeof op === "string"
          ? op.toLowerCase().indexOf(inputVal.toLowerCase()) >= 0
          : op.value.toLowerCase().indexOf(inputVal.toLowerCase()) >= 0;
      });
      return filtered;
    }
    return options;
  }, [options, inputVal]);

  const onInputChangeHandler = (e?: any) => {
    !dropdownOpen && setDropdownOpen(true);
    setInputVal(e ? e.target.value : "");
    onInputChange && onInputChange(e ? e : "");
    setKeyboardSelectedIndex(-1);
  };

  const handleKeyDown = (event: any) => {
    !dropdownOpen && setDropdownOpen(true);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        keyboardSelectedIndex < filteredOption.length - 1 &&
          setKeyboardSelectedIndex(keyboardSelectedIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        keyboardSelectedIndex > 0 &&
          setKeyboardSelectedIndex(keyboardSelectedIndex - 1);
        break;
      case "Enter":
        event.preventDefault();
        if (dropdownOpen) {
          keyboardSelectedIndex > -1 &&
            optionClicked(
              typeof filteredOption[keyboardSelectedIndex] === "string"
                ? options.findIndex(
                    (op: string) =>
                      op === filteredOption[keyboardSelectedIndex],
                  )
                : filteredOption[keyboardSelectedIndex].key,
              typeof filteredOption[keyboardSelectedIndex] === "string"
                ? filteredOption[keyboardSelectedIndex]
                : filteredOption[keyboardSelectedIndex].value,
            );
          setKeyboardSelectedIndex(keyboardSelectedIndex === -1 ? 0 : -1);
          setDropdownOpen(false);
        } else {
          setDropdownOpen(true);
        }

        break;
    }
  };

  const scroll = () => {
    optionsRef.current?.scrollTo({
      left: 0,
      top: selectedRef.current?.offsetTop,
      behavior: "instant",
    });
  };

  return (
    <SelectWrapper
      ref={wrapperRef}
      $fullWidth={fullWidth}
      compact={compact}
      className={className}
      onKeyDown={handleKeyDown}
    >
      {!disabled && search ? (
        <Input
          onClick={dropdownClicked}
          name={name}
          disabled={disabled}
          value={inputVal}
          icon={dropdownOpen ? <SearchOutlined /> : <DownOutlined />}
          fullWidth={fullWidth}
          labelText={labelText}
          onChange={onInputChangeHandler}
          placeholder="Search"
          clearInput={addClearButton}
          noHints
          loading={loading}
          onInputCleared={onOptionClear}
        />
      ) : (
        <NonSearchSelectContainer>
          {labelText && labelText.length > 0 && (
            <SelectLabel>{labelText}</SelectLabel>
          )}
          <SelectHeader
            onClick={dropdownClicked}
            name={name}
            disabled={disabled}
            compact={compact}
          >
            <HeaderSpan $loading={loading}>{title}</HeaderSpan>
            {!disabled && (
              <Arrow>
                <DownOutlined />
              </Arrow>
            )}
            {!loading &&
              !disabled &&
              addClearButton &&
              title.toString().length > 0 && (
                <ClearInputButton
                  compact
                  buttonType="nobackground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTitle("");
                    onOptionClear && onOptionClear();
                  }}
                >
                  <CloseOutlined />
                </ClearInputButton>
              )}
            {loading && (
              <LoaderDiv>
                <LoaderInline />
              </LoaderDiv>
            )}
          </SelectHeader>
        </NonSearchSelectContainer>
      )}
      {!loading && dropdownOpen && (
        <DropdownOptions
          $optionFullWidth={optionFullWidth}
          $dropdownPosition={dropdownPosition}
          ref={optionsRef}
        >
          {!loadingOptions &&
            filteredOption.map((opItem: any, index: number) =>
              opItem.value === undefined && typeof opItem === "string" ? (
                <DropdownButton
                  key={index}
                  onClick={() => optionClicked(index, opItem)}
                  compact={compact}
                  highlight={keyboardSelectedIndex === index}
                  ref={keyboardSelectedIndex === index ? selectedRef : null}
                >
                  {opItem}
                </DropdownButton>
              ) : (
                <DropdownButton
                  key={opItem.key}
                  onClick={() => optionClicked(opItem.key, opItem.value)}
                  compact={compact}
                  highlight={keyboardSelectedIndex === index}
                  ref={keyboardSelectedIndex === index ? selectedRef : null}
                >
                  {opItem.value}
                </DropdownButton>
              ),
            )}
          {!loadingOptions && filteredOption.length === 0 && (
            <DropdownEmpty onClick={() => setDropdownOpen(false)}>
              No data
            </DropdownEmpty>
          )}
          {loadingOptions && (
            <DropdownEmpty onClick={() => setDropdownOpen(false)}>
              <LoadingOutlined />
            </DropdownEmpty>
          )}
        </DropdownOptions>
      )}
      <SelectError $show={!!error}>{error}</SelectError>
    </SelectWrapper>
  );
};
