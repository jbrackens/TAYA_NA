import React, { FC, ReactNode } from "react";
import { TableBody, TableCol, TableHeader, TableRow } from "ui";
import { Container } from "./index.styled";

type TableContainerProps = {
  title?: string;
  body: ReactNode;
};

export const TableContainer: FC<TableContainerProps> = ({ title, body }) => {
  return (
    <Container>
      {title && (
        <TableHeader>
          <TableRow>
            <TableCol>{title}</TableCol>
          </TableRow>
        </TableHeader>
      )}
      <TableBody>
        <TableRow>
          <TableCol>{body}</TableCol>
        </TableRow>
      </TableBody>
    </Container>
  );
};
