import { PresenceOpts, PresenceOnJoinCallback, PresenceOnLeaveCallback } from 'phoenix';
import RealtimeChannel from './RealtimeChannel';
declare type Presence = {
    presence_ref: string;
    [key: string]: any;
};
export declare type RealtimePresenceState = {
    [key: string]: Presence[];
};
export declare type RealtimePresenceJoinPayload = {
    event: `${REALTIME_PRESENCE_LISTEN_EVENTS.JOIN}`;
    key: string;
    currentPresences: Presence[];
    newPresences: Presence[];
};
export declare type RealtimePresenceLeavePayload = {
    event: `${REALTIME_PRESENCE_LISTEN_EVENTS.LEAVE}`;
    key: string;
    currentPresences: Presence[];
    leftPresences: Presence[];
};
export declare enum REALTIME_PRESENCE_LISTEN_EVENTS {
    SYNC = "sync",
    JOIN = "join",
    LEAVE = "leave"
}
declare type RawPresenceState = {
    [key: string]: {
        metas: {
            phx_ref?: string;
            phx_ref_prev?: string;
            [key: string]: any;
        }[];
    };
};
declare type RawPresenceDiff = {
    joins: RawPresenceState;
    leaves: RawPresenceState;
};
export default class RealtimePresence {
    channel: RealtimeChannel;
    state: RealtimePresenceState;
    pendingDiffs: RawPresenceDiff[];
    joinRef: string | null;
    caller: {
        onJoin: PresenceOnJoinCallback;
        onLeave: PresenceOnLeaveCallback;
        onSync: () => void;
    };
    /**
     * Initializes the Presence.
     *
     * @param channel - The RealtimeChannel
     * @param opts - The options,
     *        for example `{events: {state: 'state', diff: 'diff'}}`
     */
    constructor(channel: RealtimeChannel, opts?: PresenceOpts);
}
export {};
//# sourceMappingURL=RealtimePresence.d.ts.map