

export type Vector2 = {
    x: number;
    y: number;
};

export type Entity = {
    position: Vector2;
    type: string;
};

type BasicMessage = {
    id: string;
    data: Entity;
};

export type BasicMessageReceived = BasicMessage & {
    type: string;
};

export type BasicMessageSend = BasicMessage & {

};

export type BasicKillSend = {
    id: string;
    type: string;
};

export interface Listeners {
    on: (message: string, predicate: (data: any) => void) => void
}

export type DeltSocket = WebSocket & Listeners;

export enum MessageTypes {
    UPDATE_OBJECT = 'update.object',
    HEART_BEAT = 'heartbeat',
    KILL_OBJECT = 'kill.object',
    ACTION_START = 'action.start',
    ACTION_STOP = 'action.stop',
}
export type Client = {
    id: string;
    hashedId: string;
    ws: DeltSocket;
    isAlive: boolean;
    data: Entity;
    hasInitialized: boolean;
}
