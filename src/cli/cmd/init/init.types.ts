export interface InitOptions {
  force: boolean;
  source: string;
  target: string[];
  paths: string[];
  resetCredentials: boolean;
  instruction?: string;
  translationMemories: string[];
}
