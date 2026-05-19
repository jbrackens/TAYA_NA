import styled from "styled-components";

// AntD v5 removed the PageHeader component. This is a local, API-compatible
// replacement built from v5 primitives (Typography/Space/Button). The
// styled wrapper keeps the original zero-padding + P8 spacing.
export const PageHeaderWrap = styled.div`
  padding-left: 0;
  padding-top: 0;
  padding-right: 0;
  margin-bottom: 16px;

  .ph-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .ph-extra {
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;
