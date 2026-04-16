import UpcomingMatches from "../components/UpcomingMatches";
import { loadUpcomingBoard } from "../lib/server/match-board";

export default async function StartingSoonPage() {
  const initialMatchesByGroup = await loadUpcomingBoard(10);

  return (
    <div>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          marginBottom: "24px",
          color: "#ffffff",
        }}
      >
        Starting Soon
      </h1>
      <UpcomingMatches initialMatchesByGroup={initialMatchesByGroup} />
    </div>
  );
}
