export interface CheckboxObjectType {
  value?: string;
  key?: string;
  checked?: boolean;
}
export const findIndex = (array: Array<CheckboxObjectType>, key: string) =>
  array.findIndex((checkboxData: any) => checkboxData.key === key);

export const filterCheckedFields = (
  array: Array<CheckboxObjectType>,
  lookFor: boolean,
) => array.filter((fields: any) => lookFor === fields.checked);

export const changeCheckedStatus = (
  array: Array<CheckboxObjectType>,
  changeTo?: boolean | undefined,
) => {
  if (changeTo === undefined || null) {
    for (let i = 0; i < array.length; i++) {
      array[i].checked = !array[i].checked;
    }
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i].checked = changeTo;
    }
  }
  return array;
};
