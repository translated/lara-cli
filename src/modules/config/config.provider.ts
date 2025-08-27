import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

import { Config, type ConfigType } from './config.types.js';

export class ConfigProvider {

  private static instance: ConfigProvider | null = null;

  private config: ConfigType | null = null;

  private static readonly CONFIG_FILE_NAME: string = '.lara.yaml';
  private readonly configPath: string;

  private constructor() {
    this.configPath = path.resolve(process.cwd(), ConfigProvider.CONFIG_FILE_NAME);
  }

  public static getInstance() {
    if(!ConfigProvider.instance) {
      ConfigProvider.instance = new ConfigProvider();
    }
    return ConfigProvider.instance;
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
