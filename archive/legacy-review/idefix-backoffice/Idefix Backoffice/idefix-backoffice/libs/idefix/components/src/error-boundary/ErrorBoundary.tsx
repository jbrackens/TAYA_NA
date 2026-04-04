import { FC, ReactNode, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorBoundary as ErrorBoundaryComponent, FallbackProps } from "react-error-boundary";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import ExpandIcon from "@mui/icons-material/KeyboardArrowDownRounded";

const FallbackComponent: FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
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

interface Props {
  children: ReactNode;
}

const ErrorBoundary: FC<Props> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <ErrorBoundaryComponent FallbackComponent={FallbackComponent} onReset={() => navigate(0)}>
      {children}
    </ErrorBoundaryComponent>
  );
};

export { ErrorBoundary };
