import React, { Children, cloneElement, FC, memo, ReactElement, useEffect, useRef } from "react";
import { ListChildComponentProps } from "react-window";
import cn from "classnames";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";

// import { getPaymentName } from "utils/payments";
// import { PAYMENT_STATUSES } from "constants/payments";
import { GeneratedRowProps } from "../types";

interface Props extends ListChildComponentProps {
  columns: ReactElement<GeneratedRowProps>[];
  handleRowHeight?: (index: number, size: number) => void;
}

const getColumnProps = (item: any, props: GeneratedRowProps): { [key: string]: any } => {
  const { children, name, comparedName, secondName, urlName, linkName } = props;

  const basicProps = {
    value: item[name],
    row: item,
    children: children,
    className: comparedName
      ? cn({
          more: item[name] > item[comparedName],
          less: item[name] < item[comparedName],
          equal: item[name] === item[comparedName]
        })
      : undefined
  };

  if (name === "link") {
    return {
      ...basicProps,
      linkValue: linkName && item[linkName]
    };
  }

  if (secondName || urlName) {
    return {
      ...basicProps,
      urlValue: urlName && item[urlName],
      secondValue: secondName && item[secondName]
    };
  }

  // if (name === "paymentMethod") {
  //   return {
  //     ...basicProps,
  //     value: getPaymentName(item[name]),
  //   };
  // }

  // if (name === "payment-button") {
  //   const isConfirm = item.status === PAYMENT_STATUSES.unconfirmed || item.status === PAYMENT_STATUSES.blocked;
  //
  //   return {
  //     ...basicProps,
  //     className: cn("payment-button", {
  //       "Mui-disabled": isConfirm ? !item.canConfirm : !item.canMarkAsPaid,
  //     }),
  //     children: isConfirm ? "Confirm invoice" : "Mark as paid",
  //     onClick: (event: MouseEvent) => {
  //       event.stopPropagation();
  //
  //       if (isConfirm && handleConfirmPayment) {
  //         handleConfirmPayment(item);
  //       }
  //       if (!isConfirm && handleMarkPayment) {
  //         handleMarkPayment(item);
  //       }
  //       onClick && onClick(item);
  //     },
  //   };
  // }

  if (name === "dropdown") {
    return {
      ...basicProps,
      children: Children.map(children, (child: any) =>
        cloneElement(child, {
          onClick: event => {
            child.props.onClick(event)(item);
          }
        })
      )
    };
  }

  return basicProps;
};

const Row: FC<Props> = ({ index, style, data, columns, handleRowHeight }) => {
  const item = data[index];
  const rowRef = useRef<any>({});

  useEffect(() => {
    if (rowRef.current && handleRowHeight) {
      handleRowHeight(index, rowRef.current.clientHeight);
    }
    // eslint-disable-next-line
  }, [rowRef]);

  return (
    <TableRow ref={handleRowHeight && rowRef} component="div" style={style}>
      {Children.map(columns, column => {
        const { className, align, style, label } = column.props;

        return (
          <TableCell
            key={`${index}-${label}`}
            style={style}
            component="div"
            align={align || "right"}
            className={className}
          >
            {cloneElement(column, getColumnProps(item, column.props))}
          </TableCell>
        );
      })}
    </TableRow>
  );
};

export default memo(Row);
