import mitt from 'mitt';
import { BusEvents } from '../types';

export const bus = mitt<BusEvents>();
