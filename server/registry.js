// server/registry.js
// Central service module registry

import { laundryConfig } from './modules/laundry.js';
import { libraryConfig } from './modules/library.js';
import { courtsConfig } from './modules/courts.js';
import { parcelsConfig } from './modules/parcels.js';
import { roomsConfig } from './modules/rooms.js';

const moduleRegistry = new Map();

moduleRegistry.set('laundry', laundryConfig);
moduleRegistry.set('library', libraryConfig);
moduleRegistry.set('courts', courtsConfig);
moduleRegistry.set('parcels', parcelsConfig);
moduleRegistry.set('rooms', roomsConfig);

export function getModuleConfig(id) {
  return moduleRegistry.get(id);
}

export function getAllModules() {
  return Array.from(moduleRegistry.values());
}
