import type { StoreApi } from 'zustand';
import { ProjectSlice } from './projectSlice';
import { ComponentSlice } from './componentSlice';
import { TaskSlice } from './taskSlice';
import { InstanceSlice } from './instanceSlice';

export type ProjectStore = ProjectSlice & ComponentSlice & TaskSlice & InstanceSlice;

/** `set` / `get` signatures passed to each slice factory. */
export type SetState = StoreApi<ProjectStore>['setState'];
export type GetState = StoreApi<ProjectStore>['getState'];