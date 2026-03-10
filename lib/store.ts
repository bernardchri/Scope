import { Store } from '@tauri-apps/plugin-store';

let configStoreInstance: Store | null = null;

export async function getConfigStore(): Promise<Store> {
  if (!configStoreInstance) {
    configStoreInstance = await Store.load('config.dat');
  }
  return configStoreInstance;
}
