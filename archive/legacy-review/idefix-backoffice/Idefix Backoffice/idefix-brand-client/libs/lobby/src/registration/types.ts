export enum RegistrationTypes {
  TOGGLE = "login/toggle"
}

export type RegistrationActions = {
  type: RegistrationTypes.TOGGLE;
};

export type RegistrationState = boolean;
