#!/usr/bin/env node
import { exit } from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Storefront } from '../store-api/common/storefront.js';
import { DeviceFamily } from '../store-api/common/device-family.js';
import search from './commands/search.js';
import download from './commands/download.js';
import purchase from './commands/purchase.js';
import * as auth from './commands/auth.js';
import { Logger } from './utils/logger.js';

yargs(hideBin(process.argv))
  .option('log-level', {
    description: 'Set the log level',
    choices: ['error', 'warning', 'info', 'debug'],
    default: 'info',
    nargs: 1,
  })
  .command(
    'auth',
    'authenticate with the App Store',
    (argv) => {
      argv
        .command(
          'login',
          'Login to the App Store',
          (argw) => {
            argw
              .option('e', {
                alias: ['email'],
                description: 'Apple ID email address',
                demandOption: process.env.IPATOOL_EMAIL === undefined,
                type: 'string',
                nargs: 1,
                default: '',
                coerce: (arg) => {
                  if (!arg && process.env.IPATOOL_EMAIL) {
                    return process.env.IPATOOL_EMAIL;
                  } else { 
                    return arg;
                  }
                },
              })
              .option('p', {
                alias: ['password'],
                description: 'Apple ID password',
                demandOption: process.env.IPATOOL_PASSWORD === undefined,
                type: 'string',
                nargs: 1,
                default: '',
                coerce: (arg) => {
                  if (!arg && process.env.IPATOOL_PASSWORD) {
                    return process.env.IPATOOL_PASSWORD;
                  } else { 
                    return arg;
                  }
                },
              })
              .option('m', {
                alias: ['2fa-code', 'mfa-code', 'auth-code'],
                description: 'Apple ID 2FA code',
                type: 'string',
                nargs: 1,
                default: '',
                coerce: (arg) => {
                  if (!arg && process.env.IPATOOL_2FA_CODE) {
                    return process.env.IPATOOL_2FA_CODE;
                  } else { 
                    return arg;
                  }
                },
              });
          },
          (args: any) => {
            auth.login(args);
          },
        )
        .command(
          'revoke',
          'Revoke saved credentials',
          (_) => {},
          (args: any) => {
            auth.revoke(args);
          },
        )
        .demandCommand()
        .help();
    },
  )
  .command(
    'purchase',
    'Obtain a license for an app from thee App Store.',
    (argv) => {
      argv
        .option('b', {
          alias: ['bundle-identifier', 'bundle-id'],
          description: 'The app to download\'s bundle ID',
          conflicts: ['i'],
          type: 'string',  
          nargs: 1, 
        })
        .option('i', {
          alias: ['track-identifier', 'track-id'],
          description: 'The app to download\'s track ID',
          conflicts: ['b'],
          type: 'string',
          nargs: 1,
        })
        .option('d', {
          alias: ['device-family'],
          description: 'The device family to limit the search query to.',
          choices: ['iPhone', 'iPad'],
          coerce: (arg) => {
            switch (arg) {
              case 'iPhone': 
                return DeviceFamily.PHONE;
              case 'iPad':
                return DeviceFamily.PAD;
            }
          },
          default: DeviceFamily.PHONE,
          nargs: 1,
        })
        .option('c', {
          alias: ['country'],
          description: 'The two-letter (ISO 3166-1 alpha-2) country code for the iTunes Store.',
          coerce: (arg) => arg.toUpperCase(),
          default: 'US',
          nargs: 1,
        })
        .check(({ b, i, c }) => {
          if (b && i) {
            throw new Error('Only bundle ID or track ID should be given.');
          } else if (!b && !i) {
            throw new Error('Needs to specify either bundle ID or track ID.');
          }
          if (!Object.keys(Storefront).includes(c)) {
            throw new Error('Invalid storefront country code given.');
          }
          return true;
        });
    },
    (args: any) => {
      const logger = new Logger(args.logLevel);
      logger.debug(JSON.stringify(args, null, 2));
      purchase(args);
    }
  )
  .command(
    'download',
    'Download encrypted iOS app packages from the App Store.',
    (argv) => {
      argv
        .option('b', {
          alias: ['bundle-identifier', 'bundle-id'],
          description: 'The app to download\'s bundle ID',
          conflicts: ['i'],
          type: 'string',  
          nargs: 1, 
        })
        .option('i', {
          alias: ['track-identifier', 'track-id'],
          description: 'The app to download\'s track ID',
          conflicts: ['b'],
          type: 'string',
          nargs: 1,
        })
        .option('d', {
          alias: ['device-family'],
          description: 'The device family to limit the search query to.',
          choices: ['iPhone', 'iPad'],
          coerce: (arg) => {
            switch (arg) {
              case 'iPhone': 
                return DeviceFamily.PHONE;
              case 'iPad':
                return DeviceFamily.PAD;
            }
          },
          default: DeviceFamily.PHONE,
          nargs: 1,
        })
        .option('c', {
          alias: ['country'],
          description: 'The two-letter (ISO 3166-1 alpha-2) country code for the iTunes Store.',
          coerce: (arg) => arg.toUpperCase(),
          default: 'US',
          nargs: 1,
        })
        .option('o', {
          alias: ['output'],
          description: 'Where to save the downloaded IPA',
          nargs: 1,
          normalize: true,
        })
        .option('purchase', {
          description: 'Obtain a license for the app if needed.',
          boolean: true,
        })
        .check(({ b, i, c }) => {
          if (b && i) {
            throw new Error('Only bundle ID or track ID should be given.');
          } else if (!b && !i) {
            throw new Error('Needs to specify either bundle ID or track ID.');
          }
          if (!Object.keys(Storefront).includes(c)) {
            throw new Error('Invalid storefront country code given.');
          }
          return true;
        });
    },
    async (args: any) => {
      const logger = new Logger(args.logLevel);
      logger.debug(JSON.stringify(args, null, 2));
      exit(await download(args) ?? 0);
    },
  )
  .command(
    'search',
    'Searches for iOS apps on the App Store',
    (argv) => {
      argv
        .positional('term', {
          description: 'The term to search for',
          demandOption: true,
        })
        .option('l', {
          alias: ['limit'],
          description: 'The maximum number of search results to retrieve.',
          type: 'number',
          default: 5,
          nargs: 1,
        })
        .option('d', {
          alias: ['device-family'],
          description: 'The device family to limit the search query to.',
          choices: ['iPhone', 'iPad'],
          coerce: (arg: DeviceFamily) => {
            switch (arg) {
              case 'iPhone': 
                return DeviceFamily.PHONE;
              case 'iPad':
                return DeviceFamily.PAD;
            }
          },
          default: DeviceFamily.PHONE,
          nargs: 1,
        })
        .option('c', {
          alias: ['country'],
          description: 'The two-letter (ISO 3166-1 alpha-2) country code for the iTunes Store.',
          default: 'US',
          nargs: 1,
          coerce: arg => arg.toUpperCase(),
        })
        .check(({ c }) => {
          if (!Object.keys(Storefront).includes(c)) {
            throw new Error('Invalid storefront country code given.');
          }
          return true;
        });
    },
    (args: any) => {
      args = Object.assign(args, {
        term: args._.at(-1),
      });
      const logger = new Logger(args.logLevel);
      logger.debug(JSON.stringify(args, null, 2));
      search(args);
    },
  )
  .epilogue('Apple ID information can be passed through flags, or through environment variables IPATOOL_EMAIL, IPATOOL_PASSWORD and IPATOOL_2FA_CODE.')
  .demandCommand()
  .version('0.1.0')
  .help()
  .parse();
