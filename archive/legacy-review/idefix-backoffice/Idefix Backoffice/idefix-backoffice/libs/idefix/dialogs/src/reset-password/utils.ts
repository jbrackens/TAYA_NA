export const steps = {
  RESET_CONFIRMATION: "reset-confirmation",
  CODE_GENERATION: "code-generation",
  CODE_CONFIRMATION: "code-confirmation",
  RESET_PASSWORD: "reset-password"
};

export const getTitle = (step: string) => {
  switch (step) {
    case steps.RESET_CONFIRMATION:
      return "Reset Confirmation";
    case steps.CODE_GENERATION:
      return "Code Generation";
    case steps.CODE_CONFIRMATION:
      return "Code Confirmation";
    case steps.RESET_PASSWORD:
      return "Reset Password";
    default:
      return "No content";
  }
};

export const getContentText = (step: string) => {
  switch (step) {
    case steps.RESET_CONFIRMATION:
      return "Do you want to reset password?";
    case steps.CODE_GENERATION:
      return "Please enter your email address...";
    case steps.CODE_CONFIRMATION:
      return "We've sent an SMS with a verification code to your phone. Please enter the 6-digit verification code below";
    default:
      return "No content";
  }
};
