
export type BasicMessageReceived = {
    id: string;
    type: string
    data: any;
};
export interface Listeners {
    on: (message: string, predicate: (data: any) => void) => void
}
export enum MessageTypes {
    UPDATE_OBJECT = 'update.object',
    KILL_OBJECT = 'kill.object',
    ACTION_START = 'action.start',
    ACTION_STOP = 'action.stop',
}
export type Client = {
    id: string;
    ws: WebSocket & Listeners;
    isAlive: boolean;
    data: BasicMessageReceived | null;
}

export type DeltSocket = WebSocket & Listeners;
