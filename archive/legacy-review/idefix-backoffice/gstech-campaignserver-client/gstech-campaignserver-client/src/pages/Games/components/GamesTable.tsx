import * as React from "react";
import { useDispatch } from "react-redux";
import { Column, CellProps, Row } from "react-table";
import { Game } from "app/types";
import { NameCell, ShowMoreCell } from "./";
import { updateGame } from "../";
import { Table, TextInput, BooleanCell } from "../../../components";
import { AppDispatch } from "../../../redux";

interface IProps {
  brandId: string;
  data: Game[];
  isLoading: boolean;
  handleOpenEditGameDrawer: (gameId: number) => void;
}

const GamesTable: React.FC<IProps> = ({ brandId, data, isLoading, handleOpenEditGameDrawer }) => {
  const dispatch: AppDispatch = useDispatch();

  const [orderHover, setOrderHover] = React.useState<number>();
  const [orderManually, setOrderManually] = React.useState<string>("");

  const handleUpdateGameOrder = React.useCallback(
    (game: Game, order: number) => {
      const { id: gameId } = game;
      dispatch(updateGame({ gameId, game: { order } }));
    },
    [dispatch]
  );

  const handleRowClick = React.useCallback(
    ({ original }: Row<Game>) => {
      const { id: gameId } = original;
      handleOpenEditGameDrawer(gameId);
    },
    [handleOpenEditGameDrawer]
  );

  const getNewOrder = React.useCallback(
    (index: number, newIndex: number) => {
      const prevRow = index < newIndex ? data[newIndex] : data[newIndex - 1];
      const nextRow = index < newIndex ? data[newIndex + 1] : data[newIndex];

      const prevOrder = prevRow?.order || 0;
      const nextOrder = nextRow?.order;

      if (!nextOrder) {
        const lastOrder = data[data.length - 1].order;
        return lastOrder + 1;
      }

      return (prevOrder + nextOrder) / 2;
    },
    [data]
  );

  const handleActivateOrderManually = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, order: number) => {
    e.stopPropagation();
    setOrderHover(order);
    setOrderManually(order.toString());
  };

  const handleChangeOrderManually = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setOrderManually(event.target.value);
  }, []);

  const handleSubmitOrderManually = React.useCallback(
    (event: React.KeyboardEvent, game: Game, index: number, newIndex: number) => {
      if (event.key === "Enter") {
        const newOrder = getNewOrder(index, newIndex);
        handleUpdateGameOrder(game, newOrder);
        setOrderHover(undefined);
      }
    },
    [getNewOrder, handleUpdateGameOrder]
  );

  const columns: Array<Column<Game>> = React.useMemo(
    () => [
      {
        Header: "№",
        accessor: "order",
        width: 30,
        Cell: ({ cell }: CellProps<Game>) => {
          const { index, original: game } = cell.row;
          const order = index + 1;
          const newIndex = Number(orderManually) - 1;

          return (
            <div
              style={{ padding: 4 }}
              onClick={event => handleActivateOrderManually(event, order)}
              onMouseLeave={() => setOrderHover(undefined)}
            >
              {orderHover === order ? (
                <TextInput
                  value={orderManually}
                  onChange={handleChangeOrderManually}
                  onKeyPress={event => handleSubmitOrderManually(event, game, index, newIndex)}
                  pattern="^[0-9]*$"
                  autoFocus
                />
              ) : (
                <span style={{ paddingLeft: 8 }}>{order}</span>
              )}
            </div>
          );
        }
      },
      {
        Header: "Name",
        accessor: "name",
        width: 100,
        Cell: NameCell
      },
      {
        Header: "Primary Type",
        accessor: "primaryCategory",
        width: 80
      },
      {
        Header: "New",
        accessor: cell => cell.newGame.toString(),
        width: 50,
        Cell: ({ cell }: CellProps<Game>) => <BooleanCell value={cell.row.original.newGame} />
      },
      {
        Header: "Jackpot",
        accessor: cell => cell.jackpot.toString(),
        width: 50,
        Cell: ({ cell }: CellProps<Game>) => <BooleanCell value={cell.row.original.jackpot} />
      },
      {
        Header: "Search Only",
        accessor: cell => cell.searchOnly.toString(),
        width: 50,
        Cell: ({ cell }: CellProps<Game>) => <BooleanCell value={cell.row.original.searchOnly} />
      },
      {
        Header: "Promoted",
        accessor: cell => cell.promoted.toString(),
        width: 50,
        Cell: ({ cell }: CellProps<Game>) => <BooleanCell value={cell.row.original.promoted} />
      },
      {
        Header: "Drop&Wins",
        accessor: cell => cell.dropAndWins.toString(),
        width: 50,
        Cell: ({ cell }: CellProps<Game>) => <BooleanCell value={cell.row.original.dropAndWins} />
      },
      {
        Header: "Manufacturer",
        accessor: "manufacturer",
        width: 80
      },
      {
        Header: "Thumb size",
        accessor: "viewMode",
        width: 80
      },
      {
        Header: "",
        accessor: "permalink"
      },
      {
        Header: "",
        width: 10,
        id: "showMore",
        Cell: ({ cell }: CellProps<Game>) => (
          <ShowMoreCell cell={cell} onUpdateGame={handleOpenEditGameDrawer} brandId={brandId} />
        )
      }
    ],
    [handleOpenEditGameDrawer, brandId, handleSubmitOrderManually, orderManually, orderHover, handleChangeOrderManually]
  );

  return (
    <Table
      columns={columns}
      data={data}
      isLoading={isLoading}
      draggableRows
      onRowClick={handleRowClick}
      onDrop={handleUpdateGameOrder}
      hiddenColumns={["permalink"]}
    />
  );
};

export { GamesTable };
