export type Role = "user" | "assistant";

export type Citation = {
  title: string;
  url: string;
  category: string;
  confidence: number;
  excerpt: string;
};

export type Feedback = "up" | "down" | null;

export type Message = {
  id: string;
  role: Role;
  content: string;
  citations?: Citation[];
  verdict?: "high" | "low";
  intent?: "company" | "general" | "ambiguous";
  emergency?: boolean;
  feedback?: Feedback;
  pending?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};
