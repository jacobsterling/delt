import {v4 as uuidv4, v5 as uuidv5} from 'uuid';

const seed = uuidv4();
export const getHash = (input: string) => uuidv5(input, seed);
