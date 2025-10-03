export interface InitOptions {
  force: boolean;
  source: string;
  target: string[];
  paths: string[];
  resetCredentials: boolean;
  context?: string;
}
