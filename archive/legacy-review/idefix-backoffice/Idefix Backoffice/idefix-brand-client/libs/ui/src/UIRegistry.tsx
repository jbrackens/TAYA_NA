import { BaseInput } from "./components/BaseInput";
import { Button } from "./components/Button";
import { Card } from "./components/Card";
import { CheckboxInput } from "./components/CheckboxInput";
import { DateInput } from "./components/DateInput";
import { Field } from "./components/Field";
import { FieldError } from "./components/FieldError";
import { FieldSuccess } from "./components/FieldSuccess";
import { NotifyMessage } from "./components/NotifyMessage";
import { Modal, InlineModal } from "./components/Modal";
import { PasswordInput } from "./components/PasswordInput";
import { PhoneNumberInput } from "./components/PhoneNumberInput";
import { RadioGroup, RadioField } from "./components/RadioField";
import { SecurityInput } from "./components/SecurityInput";
import { Select } from "./components/Select";
import { Stepper } from "./components/Stepper";
import { SubmitButton } from "./components/SubmitButton";
import { TextInput } from "./components/TextInput";
import { Tab, Tabs, TabPanel } from "./components/Tabs";
import { AmountButton } from "./components/AmountButton";
import { Switcher } from "./components/Switcher";
import { AmountInput } from "./components/AmountInput";
import { Loader } from "./components/Loader";
import { Snackbar } from "./components/Snackbar";
import { SnackbarModal } from "./components/SnackbarModal";
import { CollapsibleData } from "./components/CollapsibleData";
import { CloseButton } from "./components/CloseButton";
import { FullScreenModal } from "./components/FullScreenModal";
import {
  Logo,
  LogoNotification,
  NonLoggedInLogo,
  StickyLogoNotification
} from "./components/Logo";
import { Note } from "./components/Note";
import { FullScreenNotificationFooter } from "./components/FullScreenNotificationFooter";
import { IconButton } from "./components/IconButton";
import { TermsAndPolicy } from "./components/TermsAndPolicy";
import { FormattedMessageLink } from "./components/FormattedMessageLink";
import { ButtonLink } from "./components/ButtonLink";

const defaultRegistry = {
  BaseInput,
  Button,
  Card,
  CheckboxInput,
  DateInput,
  Field,
  FieldError,
  FieldSuccess,
  Modal,
  InlineModal,
  PasswordInput,
  PhoneNumberInput,
  RadioGroup,
  RadioField,
  SecurityInput,
  Select,
  Stepper,
  SubmitButton,
  Tab,
  TabPanel,
  Tabs,
  TextInput,
  AmountButton,
  Switcher,
  NotifyMessage,
  AmountInput,
  Loader,
  Snackbar,
  SnackbarModal,
  CollapsibleData,
  CloseButton,
  FullScreenModal,
  Logo,
  NonLoggedInLogo,
  LogoNotification,
  StickyLogoNotification,
  Note,
  FullScreenNotificationFooter,
  IconButton,
  TermsAndPolicy,
  FormattedMessageLink,
  ButtonLink
};

export type UIRegistry = typeof defaultRegistry;

export { defaultRegistry };
