import { ProjectSlice } from './projectSlice';
import { ComponentSlice } from './componentSlice';
import { TaskSlice } from './taskSlice';
import { FieldSlice } from './fieldSlice';

export type ProjectStore = ProjectSlice & ComponentSlice & TaskSlice & FieldSlice;