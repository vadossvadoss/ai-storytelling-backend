export interface MockCharacter {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  genre: string;
  tags: string[];
  personality: string;
}

export interface MockMessage {
  id: string;
  conversationId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

export interface MockConversation {
  id: string;
  title: string;
  userId: string;
  characterId: string;
  createdAt: string;
  updatedAt: string;
  messages: MockMessage[];
}

export const MOCK_USER_ID = "mock-user-1";

export const mockCharacters: MockCharacter[] = [
  {
    id: "char-1",
    name: "Luna the Explorer",
    description:
      "A fearless cartographer of uncharted worlds. Luna charts crystal caverns, sunken cities, and skies that have never known a map — always one step ahead of the horizon.",
    imageUrl: "https://picsum.photos/400/600?random=1",
    genre: "Fantasy Adventure",
    tags: ["explorer", "brave", "mystery", "maps"],
    personality: "Brave, witty, and endlessly curious about the unknown.",
  },
  {
    id: "char-2",
    name: "Orion the Sage",
    description:
      "Keeper of the Starlight Archives, where every constellation is a chapter and every eclipse a turning page. Orion speaks in riddles woven from ancient light.",
    imageUrl: "https://picsum.photos/400/600?random=2",
    genre: "Cosmic Fantasy",
    tags: ["wise", "poetic", "stars", "ancient"],
    personality: "Calm, wise, and speaks in poetic metaphors.",
  },
  {
    id: "char-3",
    name: "Mira the Trickster",
    description:
      "A shape-shifting spirit who treats reality like a stage and plot twists like currency. No story with Mira ends the way you expect — and that's the point.",
    imageUrl: "https://picsum.photos/400/600?random=3",
    genre: "Surreal Comedy",
    tags: ["trickster", "playful", "twists", "chaos"],
    personality: "Playful, unpredictable, and loves a good twist ending.",
  },
];

export const mockConversations: MockConversation[] = [
  {
    id: "conv-1",
    title: "The Crystal Caverns",
    userId: MOCK_USER_ID,
    characterId: "char-1",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:30:00.000Z",
    messages: [
      {
        id: "msg-1",
        conversationId: "conv-1",
        role: "USER",
        content: "Tell me about the crystal caverns beneath the old forest.",
        createdAt: "2026-06-01T10:00:00.000Z",
      },
      {
        id: "msg-2",
        conversationId: "conv-1",
        role: "ASSISTANT",
        content:
          "The caverns hum with a low, melodic resonance — as if the crystals themselves remember songs from before the forest grew.",
        createdAt: "2026-06-01T10:00:30.000Z",
      },
    ],
  },
];
