import React, { FC, useCallback, useState } from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { useNavigate } from "react-router-dom";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Divider from "@material-ui/core/Divider";
import ExpandIcon from "@material-ui/icons/KeyboardArrowDownRounded";
import { Collapse } from "@material-ui/core";

const FallbackComponent = ({ error, resetErrorBoundary }: FallbackProps) => {
  const [expanded, setExpanded] = useState(false);

  const handleClick = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  return (
    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" width={1}>
      <Typography variant="h2">An error occurred. It's not your fault!</Typography>
      <Box>
        <Typography>Try to reload page or contact technical support</Typography>
        <Divider light />
      </Box>
      <Box mt={4}>
        <Button onClick={resetErrorBoundary}>Reload Page</Button>
      </Box>
      <Box display="flex" flexDirection="column" mt={4} width={1}>
        <Box alignSelf="center">
          <Button endIcon={<ExpandIcon />} onClick={handleClick}>
            {expanded ? "Hide" : "Show"} error message
          </Button>
        </Box>
        <Box mt={2} bgcolor="#FAFAFA">
          <Collapse in={expanded}>
            <pre>{error.message}</pre>
          </Collapse>
        </Box>
      </Box>
    </Box>
  );
};

const ErrorBoundaryComponent: FC = ({ children }) => {
  const navigate = useNavigate();
  return (
    <ErrorBoundary FallbackComponent={FallbackComponent} onReset={() => navigate(0)}>
      {children}
    </ErrorBoundary>
  );
};

export { ErrorBoundaryComponent };
