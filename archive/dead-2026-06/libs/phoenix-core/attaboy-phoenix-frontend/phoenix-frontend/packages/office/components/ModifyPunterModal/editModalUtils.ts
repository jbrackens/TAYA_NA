import { isEqual } from "lodash";
import { getCountryList, getStateList } from "@phoenix-ui/utils";

export const formLabels = (fieldVal: string) => {
  switch (fieldVal) {
    case "ssn":
      return "SSN";
    case "address":
      return "Address";
    case "dob":
      return "Date of birth";
    case "name":
      return "Name";
    case "phone":
      return "Phone";
    default:
      return null;
  }
};

export const isFieldLayoutHorizontal = (fieldVal: string) => {
  if (fieldVal === "dob") return true;
  return false;
};

export const getEndpoint = (fieldVal: string) => {
  switch (fieldVal) {
    case "ssn":
      return "ssn";
    case "address":
      return "address";
    case "dob":
      return "dob";
    case "name":
      return "personal-name";
    case "phone":
      return "phone-number";
    default:
      return null;
  }
};

// Field details can be:
// * type: for specifying input type
// * rules: for custom rules
// * field: input, select or any other input fields
// Note: All the fields are optional.
export const getCustomFieldDetails: any = (fieldVal: string) => {
  let fieldDetails = {};
  switch (fieldVal) {
    case "ssn":
      fieldDetails = {
        SSN: {
          type: "number",
          rules: [
            {
              pattern: /^\d{9}$/,
              message: "Please enter 9 digit SSN",
            },
          ],
        },
      };
      break;
    case "address":
      fieldDetails = {
        State: {
          field: "select",
        },
        Country: {
          field: "select",
        },
      };
      break;
    case "dob":
      fieldDetails = {
        Month: {
          field: "select",
        },
        Day: {
          field: "select",
        },
        Year: {
          field: "select",
        },
      };
      break;
    case "name":
      fieldDetails = {
        Title: {
          field: "select",
        },
      };
      break;
  }
  return fieldDetails;
};

export const createPayload = (fieldName: string, data: any) => {
  let payload = {};
  switch (fieldName) {
    case "ssn":
      payload = {
        ssn: data.SSN,
      };
      break;
    case "address":
      payload = {
        address: {
          addressLine: data.AddressLine,
          city: data.City,
          state: data.State,
          zipcode: data.Zipcode,
          country: data.Country,
        },
      };
      break;
    case "dob":
      payload = {
        dateOfBirth: {
          day: data.Day,
          month: data.Month,
          year: data.Year,
        },
      };
      break;
    case "name":
      payload = {
        personalName: {
          title: data.Title,
          firstName: data.Firstname,
          lastName: data.Lastname,
        },
      };
      break;
    case "phone":
      payload = {
        phoneNumber: data.Phone,
      };
      break;
  }
  return payload;
};

const generateArray = (start: number, end: number) => {
  let array = [];
  for (let i = start; i <= end; i++) {
    array.push({ label: String(i), value: String(i) });
  }
  return array;
};

// Called incase the field is Select
export const getFieldOptions = (fieldVal: string) => {
  let options: Array<Object> = [];
  switch (fieldVal) {
    case "Month":
      options = generateArray(1, 12);
      break;
    case "Day":
      options = generateArray(1, 31);
      break;
    case "Year":
      const maxYear = new Date().getFullYear();
      const minYear = maxYear - 100;
      options = generateArray(minYear, maxYear).reverse();
      break;
    case "Title":
      options = [
        { label: "Mr", value: "Mr" },
        { label: "Mrs", value: "Mrs" },
      ];
      break;
    case "State":
      options = getStateList();
      break;
    case "Country":
      options = getCountryList();
      break;
    default:
      options = [];
      break;
  }
  return options;
};

export const compareObject = (obj1: {}, obj2: {}) => isEqual(obj1, obj2);
