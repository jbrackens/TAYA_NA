import { FC } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

const NotFoundPage: FC = () => {
  return (
    <Box
      width="100%"
      height="calc(100vh - 48px)"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Typography color="inherit">404 Page not found</Typography>
      <Box mt={3}>
        <Button component={Link} to="/" color="primary">
          Return Home
        </Button>
      </Box>
    </Box>
  );
};

export { NotFoundPage };
