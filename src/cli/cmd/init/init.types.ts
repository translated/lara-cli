import { LocalesType } from '../../../modules/common/common.types.js';

export type Options = {
  force: boolean;
  source: LocalesType;
  target: LocalesType[];
  paths: string[];
};
