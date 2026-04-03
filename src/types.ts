export interface ChatOptions {
  endpoint: string;
  stream: boolean;
  jsonOutput: boolean;
  timeout: number;
  auth?: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface DockerContainer {
  name: string;
  ports: string;
  status: string;
}
