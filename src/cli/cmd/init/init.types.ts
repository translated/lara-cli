export interface InitOptions {
  force: boolean;
  source: string;
  target: string[];
  paths: string[];
  resetCredentials: boolean;
  instruction?: string;
  translationMemories: string[];
  glossaries: string[];
}

export type SearchPathsOptions = {
  source?: string;
};
