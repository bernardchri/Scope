import { Store } from '@tauri-apps/plugin-store';

let storeInstance: Store | null = null;

export async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load('projects.dat');
  }
  return storeInstance;
}