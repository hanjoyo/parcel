// @flow

import type {ConfigResult, File, FilePath} from '@parcel/types';
import type {FileSystem} from '@parcel/fs';
import path from 'path';
import clone from 'clone';

type ConfigOutput = {|
  config: ConfigResult,
  files: Array<File>
|};

type ConfigOptions = {|
  parse?: boolean
|};

const PARSERS = {
  json: require('json5').parse,
  toml: require('@iarna/toml').parse
};

const existsCache = new Map();
const inProgress = new Map();

export async function resolveConfig(
  fs: FileSystem,
  filepath: FilePath,
  filenames: Array<FilePath>,
  root: FilePath
) {
  let key = path.dirname(filepath) + filenames.join(':');
  if (inProgress.has(key)) {
    return inProgress.get(key);
  }

  let promise = resolveConfigUncached(fs, filepath, filenames, root).finally(
    () => {
      // inProgress.delete(key);
    }
  );

  inProgress.set(key, promise);
  return promise;
}

async function resolveConfigUncached(
  fs: FileSystem,
  filepath: FilePath,
  filenames: Array<FilePath>,
  root: FilePath
): Promise<FilePath | null> {
  // console.log('load', require('worker_threads').threadId, filepath, filenames)
  filepath = path.dirname(filepath);

  // Don't traverse above the module root
  if (
    // filepath === root ||
    filepath === path.parse(filepath).root ||
    path.basename(filepath) === 'node_modules'
  ) {
    return null;
  }

  for (const filename of filenames) {
    let file = path.join(filepath, filename);
    if (await fs.exists(file)) {
      // if ((await fs.check(file)) === 0) {
      return file;
    }
  }

  return resolveConfig(fs, filepath, filenames, root);
}

export async function loadConfig(
  fs: FileSystem,
  filepath: FilePath,
  filenames: Array<FilePath>,
  opts: ?ConfigOptions,
  root
): Promise<ConfigOutput | null> {
  filepath = await fs.realpath(filepath);
  let configFile = await resolveConfig(fs, filepath, filenames, root);
  if (configFile) {
    try {
      let extname = path.extname(configFile).slice(1);
      if (extname === 'js') {
        return {
          // $FlowFixMe
          config: clone(require(configFile)),
          files: [{filePath: configFile}]
        };
      }

      let configContent = await fs.readFile(configFile, 'utf8');
      if (!configContent) {
        return null;
      }

      let config;
      if (opts && opts.parse === false) {
        config = configContent;
      } else {
        let parse = PARSERS[extname] || PARSERS.json;
        config = parse(configContent);
      }

      return {
        config: config,
        files: [{filePath: configFile}]
      };
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
        existsCache.delete(configFile);
        return null;
      }

      throw err;
    }
  }

  return null;
}
