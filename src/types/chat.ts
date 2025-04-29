export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "ally" | "narrator";
  content: string;
  createdAt: number;
}

export interface GameState {
  act: number;
  cipher1_active?: boolean;
  cipher1_solved?: boolean;
  have_drive?: boolean;
  puzzle2_solved?: boolean;
  secure_channel_open?: boolean;
} 