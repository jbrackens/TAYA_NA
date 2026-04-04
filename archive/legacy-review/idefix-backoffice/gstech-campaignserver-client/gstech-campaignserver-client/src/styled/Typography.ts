import { createGlobalStyle } from "styled-components";

export const Typography = createGlobalStyle`
  .text-header-big {
    font-style: normal;
    font-weight: 500;
    font-size: 32px;
    line-height: 48px;
  }

  .text-header {
    font-style: normal;
    font-weight: 500;
    font-size: 20px;
    line-height: 32px;
  }

  .text-header-small {
    font-style: normal;
    font-weight: 500;
    font-size: 16px;
    line-height: 24px;
  }

  .text-main-reg {
    font-style: normal;
    font-weight: normal;
    font-size: 14px;
    line-height: 20px;
  }

  .text-main-italic {
    font-style: italic;
    font-weight: normal;
    font-size: 14px;
    line-height: 20px;
  }

  .text-main-med {
    font-style: normal;
    font-weight: 500;
    font-size: 14px;
    line-height: 20px;
  }

  .text-small-reg {
    font-style: normal;
    font-weight: normal;
    font-size: 12px;
    line-height: 16px;
  }

  .text-small-med {
    font-style: normal;
    font-weight: 500;
    font-size: 12px;
    line-height: 16px;
  }
`;
