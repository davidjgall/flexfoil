/**
 * Active storage backend singleton.
 *
 * Resolves once at first access: LocalAPIBackend when served by the Python
 * server (port 8420 or ?local=1), BrowserBackend otherwise.
 */

import type { StorageBackend } from './storageBackend';
import { isLocalMode } from './storageBackend';
import { browserBackend } from './browserBackend';
import { localApiBackend } from './localApiBackend';

let _backend: StorageBackend | null = null;

export function getBackend(): StorageBackend {
  if (_backend) return _backend;
  _backend = isLocalMode() ? localApiBackend : browserBackend;
  return _backend;
}
