export type GameRoomStatus = "waiting" | "starting" | "playing" | "finished" | "closed";
export type GameRoomRole = "teacher" | "student";

export type GameRoomPlayerView = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isReady: boolean;
  isSelf: boolean;
  memberStatus: "active" | "left" | "kicked";
};

export type GameRoomView = {
  id: string;
  roomCode: string;
  hostDisplayName: string;
  status: GameRoomStatus;
  gameType: string | null;
  maxPlayers: number;
  expiresAt: string;
  players: GameRoomPlayerView[];
  role: GameRoomRole;
};

export type GameRoomApiResponse = {
  ok: boolean;
  message?: string;
  room?: GameRoomView;
  roomId?: string;
  roomCode?: string;
};
