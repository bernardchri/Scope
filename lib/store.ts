import { Store } from '@tauri-apps/plugin-store';

let storeInstance: Store | null = null;
let configStoreInstance: Store | null = null;

export async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load('projects.dat');
  }
  return storeInstance;
}

export async function getConfigStore(): Promise<Store> {
  if (!configStoreInstance) {
    configStoreInstance = await Store.load('config.dat');
  }
  return configStoreInstance;
}