import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

import { CONFIG_PATH } from './config.const.js';
import { Config, type ConfigType } from './config.types.js';

class ConfigProvider {

  private config: ConfigType | null = null;
  private readonly configPath: string;

  constructor() {
    this.configPath = path.resolve(process.cwd(), CONFIG_PATH);
  }

  public doesConfigExists() {
    return fs.existsSync(this.configPath);
  }

  public getConfig(): ConfigType {
    if(this.config) {
      return this.config;
    }

    if(!this.doesConfigExists()) {
      throw new Error('Config file not found');
    }

    const config = fs.readFileSync(this.configPath, 'utf8');

    const safeConfig = Config.safeParse(yaml.parse(config));

    if(!safeConfig.success) {
      throw new Error(`Invalid config file: ${safeConfig.error.issues[0]?.message || 'Unknown error'}`);
    }
    this.config = safeConfig.data;

    return this.config;
  } 

  public saveConfig(config: ConfigType) {
    if(this.doesConfigExists()) {
      fs.unlinkSync(this.configPath);
    }

    fs.writeFileSync(this.configPath, yaml.stringify(config));
    this.config = config;
  }
}

export default new ConfigProvider();
