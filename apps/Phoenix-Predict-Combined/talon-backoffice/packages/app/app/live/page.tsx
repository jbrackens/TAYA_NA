import LiveNow from "../components/LiveNow";
import { loadLiveBoard } from "../lib/server/match-board";

export default async function LivePage() {
  const initialMatchesByGroup = await loadLiveBoard(50);

  return (
    <div>
      <h1 style={{
        fontSize: "28px",
        fontWeight: 700,
        marginBottom: "24px",
        color: "#ffffff",
      }}>
        Live Matches
      </h1>
      <LiveNow initialMatchesByGroup={initialMatchesByGroup} />
    </div>
  );
}
