import fs from 'fs/promises';
import yaml from 'yaml';
import crypto from 'crypto';

type FileKey = Record<string, string>;

type Lock = {
  version: string;
  files: Record<string, FileKey>;
};

export class ChecksumService {

  private static readonly CHECKSUM_FILE = '.lara.lock';

  private lock: Lock;

  private async initLock() {
    if(this.lock) {
      return;
    }

    try{ 
      const lockContent = await fs.readFile(ChecksumService.CHECKSUM_FILE, 'utf8');
      this.lock = yaml.parse(lockContent) as Lock;
    } catch {
      const lock: Lock = {
        version: '1.0.0',
        files: {}
      };

      await fs.writeFile(ChecksumService.CHECKSUM_FILE, yaml.stringify(lock));
      this.lock = lock;
    }
  }


  public async getChangedKeys(filePath: string, content: Record<string, unknown>) {
    await this.initLock();

    const fileChecksum = await this.getHash(filePath);

    const fileLock = this.lock.files[fileChecksum];

    if(!fileLock) {
      // If the file is not in the lock, it means it's a new file.
      // To prevent false positives, we return an empty array.
      await this.updateLock(filePath, content);
      return [];
    }

    const changedKeys: string[] = [];

    await Promise.all(Object.keys(content).map(async (key) => {
      const value = content[key];
      if(!value) {
        return;
      }
      
      const hash = await this.getHash(value);

      if(fileLock[key] !== hash) {
        changedKeys.push(key);
      }
    }));

    if(changedKeys.length > 0) {
      await this.updateLock(filePath, content);
    }

    return changedKeys;
  }

  private async updateLock(filePath: string, content: Record<string, unknown>) {
    await this.initLock();

    const fileChecksum = await this.getHash(filePath);

    await Promise.all(Object.keys(content).map(async (key) => {
      const value = content[key];
      if(!value) {
        return;
      }

      const hash = await this.getHash(value);

      if(!this.lock.files[fileChecksum]) {
        this.lock.files[fileChecksum] = {};
      }

      this.lock.files[fileChecksum][key] = hash;
    }));

    await fs.writeFile(ChecksumService.CHECKSUM_FILE, yaml.stringify(this.lock));
  }

  // Returns the MD5 hash of a string or an object.
  private async getHash(s: unknown) {
    const data: string = typeof s === 'string' ? s : JSON.stringify(s);

    return crypto.createHash('md5').update(data).digest('hex');
  }
}
