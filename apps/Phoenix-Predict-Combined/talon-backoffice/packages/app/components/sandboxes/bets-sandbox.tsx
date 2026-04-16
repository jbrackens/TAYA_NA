import { useDispatch } from "react-redux";
import {
  toggleBetElement,
  clearBets,
  clearSummaryValues,
} from "../../lib/slices/betSlice";

export default function BetsSandbox() {
  const dispatch = useDispatch();
  return (
    <>
      <button
        onClick={() =>
          dispatch(
            toggleBetElement({
              brandMarketId: "od:match:18161:market:1",
              marketName: "Match winner - twoway",
              fixtureName: "Lyngby Vikings vs Dignitas",
              selectionId: "2",
              selectionName: "Dignitas",
              odds: {
                american: "+2000",
                decimal: 21.37,
                fractional: "20/1",
              },
              fixtureStatus: "",
              fixtureId: "",
              sportId: "",
            }),
          )
        }
      >
        add new betSlip element
      </button>
      <button
        onClick={() =>
          dispatch(
            toggleBetElement({
              brandMarketId: "od:match:18762:market:1",
              marketName: "Match winner - threeway",
              fixtureName: "Quincy Crew vs beastcoast",
              selectionId: "1",
              selectionName: "Quincy Crew",
              odds: {
                american: "+2000",
                decimal: 21.37,
                fractional: "20/1",
              },
              fixtureStatus: "",
              fixtureId: "",
              sportId: "",
            }),
          )
        }
      >
        add another betSlip element
      </button>
      <button
        onClick={() => {
          dispatch(clearBets());
          dispatch(clearSummaryValues());
        }}
      >
        rmove bets
      </button>
    </>
  );
}
