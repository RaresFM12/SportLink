import { useState } from "react";
import {
  Users,
  Shuffle,
  CheckCircle,
  Copy,
  Download,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

interface TeamSplitterProps {
  participants: string[];
  sportType: string;
  onClose: () => void;
}

interface PlayerCardProps {
  name: string;
  teamIndex: number;
  playerIndex: number;
  onMovePlayer: (
    fromTeam: number,
    fromIndex: number,
    toTeam: number,
  ) => void;
}

const TEAM_COLORS = [
  {
    bg: "bg-blue-500/20",
    border: "border-blue-500",
    text: "text-blue-400",
    name: "Blue",
  },
  {
    bg: "bg-red-500/20",
    border: "border-red-500",
    text: "text-red-400",
    name: "Red",
  },
  {
    bg: "bg-green-500/20",
    border: "border-green-500",
    text: "text-green-400",
    name: "Green",
  },
  {
    bg: "bg-yellow-500/20",
    border: "border-yellow-500",
    text: "text-yellow-400",
    name: "Yellow",
  },
];

function PlayerCard({
  name,
  teamIndex,
  playerIndex,
  //onMovePlayer,
}: PlayerCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: "PLAYER",
    item: { name, teamIndex, playerIndex },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const teamColor = TEAM_COLORS[teamIndex];

  return (
    <div
      ref={(node) => {
        drag(node);
      }}
      className={`p-3 rounded-lg ${teamColor.bg} border-2 ${teamColor.border} cursor-move transition-all ${
      isDragging ? "opacity-50 scale-95" : "hover:scale-105"
    }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full ${teamColor.border} border-2 flex items-center justify-center ${teamColor.text} font-bold`}
        >
          {name.charAt(0)}
        </div>
        <span className="text-white font-medium">{name}</span>
      </div>
    </div>
  );
}

interface TeamDropZoneProps {
  teamIndex: number;
  players: string[];
  onDrop: (
    fromTeam: number,
    fromIndex: number,
    toTeam: number,
  ) => void;
}

function TeamDropZone({
  teamIndex,
  players,
  onDrop,
}: TeamDropZoneProps) {
  const [{ isOver }, drop] = useDrop({
    accept: "PLAYER",
    drop: (item: {
      teamIndex: number;
      playerIndex: number;
    }) => {
      if (item.teamIndex !== teamIndex) {
        onDrop(item.teamIndex, item.playerIndex, teamIndex);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const teamColor = TEAM_COLORS[teamIndex];

  return (
    <div
      ref={(node) => {
        drop(node);
     }}
      className={`rounded-xl border-2 ${teamColor.border} p-4 min-h-[200px] transition-all ${
        isOver ? "bg-gray-700/50 scale-102" : "bg-[#1a1a1a]"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`w-10 h-10 rounded-full ${teamColor.bg} border-2 ${teamColor.border} flex items-center justify-center`}
        >
          <Users className={`w-5 h-5 ${teamColor.text}`} />
        </div>
        <div>
          <h3 className={`font-bold ${teamColor.text}`}>
            Team {teamColor.name}
          </h3>
          <p className="text-sm text-gray-400">
            {players.length} players
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {players.map((player, index) => (
          <PlayerCard
            key={`${teamIndex}-${index}-${player}`}
            name={player}
            teamIndex={teamIndex}
            playerIndex={index}
            onMovePlayer={onDrop}
          />
        ))}
      </div>
    </div>
  );
}

export function TeamSplitter({
  participants,
  sportType,
  onClose,
}: TeamSplitterProps) {
  const [numTeams, setNumTeams] = useState(2);
  const [teams, setTeams] = useState<string[][]>([]);
  const [splitStrategy, setSplitStrategy] = useState<
    "random" | "alternating" | "balanced"
  >("random");
  const [hasGenerated, setHasGenerated] = useState(false);

  const splitTeamsRandom = () => {
    const shuffled = [...participants].sort(
      () => Math.random() - 0.5,
    );
    const newTeams: string[][] = Array.from(
      { length: numTeams },
      () => [],
    );

    shuffled.forEach((player, index) => {
      newTeams[index % numTeams].push(player);
    });

    setTeams(newTeams);
    setHasGenerated(true);
  };

  const splitTeamsAlternating = () => {
    const newTeams: string[][] = Array.from(
      { length: numTeams },
      () => [],
    );

    participants.forEach((player, index) => {
      newTeams[index % numTeams].push(player);
    });

    setTeams(newTeams);
    setHasGenerated(true);
  };

  const splitTeamsBalanced = () => {
    // Assign a random "skill" score for demonstration
    const playersWithSkill = participants
      .map((name) => ({
        name,
        skill: Math.random() * 100,
      }))
      .sort((a, b) => b.skill - a.skill);

    const newTeams: string[][] = Array.from(
      { length: numTeams },
      () => [],
    );
    const teamSkills: number[] = Array.from(
      { length: numTeams },
      () => 0,
    );

    // Snake draft: assign players to teams to balance total skill
    playersWithSkill.forEach((player) => {
      const minSkillTeamIndex = teamSkills.indexOf(
        Math.min(...teamSkills),
      );
      newTeams[minSkillTeamIndex].push(player.name);
      teamSkills[minSkillTeamIndex] += player.skill;
    });

    setTeams(newTeams);
    setHasGenerated(true);
  };

  const handleSplit = () => {
    if (splitStrategy === "random") {
      splitTeamsRandom();
    } else if (splitStrategy === "alternating") {
      splitTeamsAlternating();
    } else {
      splitTeamsBalanced();
    }
  };

  const handleMovePlayer = (
    fromTeam: number,
    fromIndex: number,
    toTeam: number,
  ) => {
    const newTeams = teams.map((team) => [...team]);
    const [player] = newTeams[fromTeam].splice(fromIndex, 1);
    newTeams[toTeam].push(player);
    setTeams(newTeams);
  };

  const copyToClipboard = () => {
    const text = teams
      .map((team, index) => {
        const color = TEAM_COLORS[index];
        return `Team ${color.name} (${team.length} players):\n${team.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(text);
  };

  const downloadAsText = () => {
    const text = teams
      .map((team, index) => {
        const color = TEAM_COLORS[index];
        return `Team ${color.name} (${team.length} players):\n${team.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
      })
      .join("\n\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team-split.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-[#292828] border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Smart Team Splitter
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Automatically divide {participants.length}{" "}
            participants into balanced teams for your{" "}
            {sportType} event
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuration */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Number of Teams */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Teams
                </label>
                <select
                  value={numTeams}
                  onChange={(e) =>
                    setNumTeams(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-[#292828] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={hasGenerated}
                >
                  <option value={2}>2 Teams</option>
                  <option value={3}>3 Teams</option>
                  <option value={4}>4 Teams</option>
                </select>
              </div>

              {/* Split Strategy */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Split Strategy
                </label>
                <select
                  value={splitStrategy}
                  onChange={(e) =>
                    setSplitStrategy(e.target.value as any)
                  }
                  className="w-full px-3 py-2 bg-[#292828] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={hasGenerated}
                >
                  <option value="random">Random Shuffle</option>
                  <option value="alternating">
                    Alternating Pick
                  </option>
                </select>
              </div>

              {/* Generate Button */}
              <div className="flex items-end">
                <Button
                  onClick={handleSplit}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  disabled={participants.length < numTeams}
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  {hasGenerated ? "Re-generate" : "Generate"}
                </Button>
              </div>
            </div>

            {/* Strategy Info */}
            <div className="mt-4 p-3 bg-[#292828] rounded-lg border border-gray-600">
              <p className="text-sm text-gray-400">
                {splitStrategy === "random" &&
                  "🎲 Random: Shuffles all players and distributes them evenly across teams"}
                {splitStrategy === "alternating" &&
                  "🔄 Alternating: Picks players in round-robin fashion for fair distribution"}
                {splitStrategy === "balanced" &&
                  "⚖️ Balanced: Uses skill-based algorithm to create evenly matched teams"}
              </p>
            </div>
          </div>

          {/* Teams Display */}
          {hasGenerated && (
            <DndProvider backend={HTML5Backend}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">
                      Teams Generated!
                    </span>
                    <span className="text-gray-400 text-sm">
                      Drag players to adjust teams
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="border-gray-600 hover:bg-gray-800"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAsText}
                      className="border-gray-600 hover:bg-gray-800"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                <div
                  className={`grid gap-4 ${numTeams === 2 ? "grid-cols-1 md:grid-cols-2" : numTeams === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}
                >
                  {teams.map((team, index) => (
                    <TeamDropZone
                      key={index}
                      teamIndex={index}
                      players={team}
                      onDrop={handleMovePlayer}
                    />
                  ))}
                </div>
              </div>
            </DndProvider>
          )}

          {/* Empty State */}
          {!hasGenerated && (
            <div className="text-center py-12 bg-[#1a1a1a] rounded-xl border border-gray-700">
              <ArrowLeftRight className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">
                Configure your preferences above and click
                "Generate Teams" to get started
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}