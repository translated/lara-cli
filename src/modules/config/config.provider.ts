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

  public getConfig() {
    if(!this.doesConfigExists()) {
      throw new Error('Config file not found');
    }

    if(this.config) {
      return this.config;
    }

    const config = fs.readFileSync(this.configPath, 'utf8');

    try {
      this.config = Config.parse(yaml.parse(config));
    } catch(error) {
      throw new Error(`Invalid config file: ${error}`);
    }

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
