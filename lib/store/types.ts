import { ProjectSlice } from './projectSlice';
import { ComponentSlice } from './componentSlice';
import { TaskSlice } from './taskSlice';
import { InstanceSlice } from './instanceSlice';

export type ProjectStore = ProjectSlice & ComponentSlice & TaskSlice & InstanceSlice;