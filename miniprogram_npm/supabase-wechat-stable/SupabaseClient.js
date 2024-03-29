"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./lib/constants");
const helpers_1 = require("./lib/helpers");
const SupabaseAuthClient_1 = require("./lib/SupabaseAuthClient");
const SupabaseQueryBuilder_1 = require("./lib/SupabaseQueryBuilder");
const index_1 = require("./storage-js/src/index");
const index_2 = require("./functions-js/src/index");
const index_3 = require("./postgrest-js/src/index");
const index_4 = require("./realtime-js/src/index");
const DEFAULT_OPTIONS = {
    schema: 'public',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    multiTab: true,
    headers: constants_1.DEFAULT_HEADERS,
};
const DEFAULT_REALTIME_OPTIONS = {};
/**
 * Supabase Client.
 *
 * An isomorphic Javascript client for interacting with Postgres.
 */
class SupabaseClient {
    /**
     * Create a new client for use in the browser.
     * @param supabaseUrl The unique Supabase URL which is supplied when you create a new project in your project dashboard.
     * @param supabaseKey The unique Supabase Key which is supplied when you create a new project in your project dashboard.
     * @param options.schema You can switch in between schemas. The schema needs to be on the list of exposed schemas inside Supabase.
     * @param options.autoRefreshToken Set to "true" if you want to automatically refresh the token before expiring.
     * @param options.persistSession Set to "true" if you want to automatically save the user session into local storage.
     * @param options.detectSessionInUrl Set to "true" if you want to automatically detects OAuth grants in the URL and signs in the user.
     * @param options.headers Any additional headers to send with each network request.
     * @param options.multiTab Set to "false" if you want to disable multi-tab/window events.
     * @param options.fetch A custom fetch implementation.
     */
    constructor(supabaseUrl, supabaseKey, options) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        if (!supabaseUrl)
            throw new Error('supabaseUrl is required.');
        if (!supabaseKey)
            throw new Error('supabaseKey is required.');
        const _supabaseUrl = (0, helpers_1.stripTrailingSlash)(supabaseUrl);
        const settings = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
        this.realtimeUrl = `${_supabaseUrl}/realtime/v1`.replace(/^http/i, 'ws');
        this.restUrl = `${_supabaseUrl}/rest/v1`;
        this.authUrl = `${_supabaseUrl}/auth/v1`;
        this.storageUrl = `${_supabaseUrl}/storage/v1`;
        const isPlatform = _supabaseUrl.match(/(supabase\.co)|(supabase\.in)/);
        if (isPlatform) {
            const urlParts = _supabaseUrl.split('.');
            this.functionsUrl = `${urlParts[0]}.functions.${urlParts[1]}.${urlParts[2]}`;
        }
        else {
            this.functionsUrl = `${_supabaseUrl}/functions/v1`;
        }
        this.schema = settings.schema;
        this.multiTab = settings.multiTab;
        this.fetch = settings.fetch;
        this.headers = Object.assign(Object.assign({}, constants_1.DEFAULT_HEADERS), options === null || options === void 0 ? void 0 : options.headers);
        this.realtime = this._initRealtimeClient(Object.assign({ headers: this.headers }, settings.realtime));
        this.shouldThrowOnError = settings.shouldThrowOnError || false;
        this.auth = this._initSupabaseAuthClient(settings);
        this._listenForAuthEvents();
        this._listenForMultiTabEvents();
    }
    /**
     * Supabase Functions allows you to deploy and invoke edge functions.
     */
    get functions() {
        return new index_2.FunctionsClient(this.functionsUrl, {
            headers: this._getAuthHeaders(),
            customFetch: this.fetch,
        });
    }
    /**
     * Supabase Storage allows you to manage user-generated content, such as photos or videos.
     */
    get storage() {
        return new index_1.SupabaseStorageClient(this.storageUrl, this._getAuthHeaders(), this.fetch);
    }
    /**
     * Perform a table operation.
     *
     * @param table The table name to operate on.
     */
    from(table) {
        const url = `${this.restUrl}/${table}`;
        return new SupabaseQueryBuilder_1.SupabaseQueryBuilder(url, {
            headers: this._getAuthHeaders(),
            schema: this.schema,
            table,
            fetch: this.fetch,
            shouldThrowOnError: this.shouldThrowOnError,
        });
    }
    /**
     * Perform a function call.
     *
     * @param fn  The function name to call.
     * @param params  The parameters to pass to the function call.
     * @param head   When set to true, no data will be returned.
     * @param count  Count algorithm to use to count rows in a table.
     *
     */
    rpc(fn, params, { head = false, count = null, } = {}) {
        const rest = this._initPostgRESTClient();
        return rest.rpc(fn, params, { head, count });
    }
    /**
     * Creates a Realtime channel with Broadcast, Presence, and Postgres Changes.
     *
     * @param {string} name - The name of the Realtime channel.
     * @param {Object} opts - The options to pass to the Realtime channel.
     *
     */
    channel(name, opts = {}) {
        return this.realtime.channel(name, opts);
    }
    /**
     * Returns all Realtime channels.
     */
    getChannels() {
        return this.realtime.getChannels();
    }
    /**
     * Unsubscribes and removes Realtime channel from Realtime client.
     *
     * @param {RealtimeChannel} channel - The name of the Realtime channel.
     *
     */
    removeChannel(channel) {
        return this.realtime.removeChannel(channel);
    }
    /**
     * Unsubscribes and removes all Realtime channels from Realtime client.
     */
    removeAllChannels() {
        return this.realtime.removeAllChannels();
    }
    _initRealtimeClient(options) {
        return new index_4.RealtimeClient(this.realtimeUrl, Object.assign(Object.assign({}, options), { params: Object.assign({ apikey: this.supabaseKey }, options === null || options === void 0 ? void 0 : options.params) }));
    }
    _initSupabaseAuthClient({ autoRefreshToken, persistSession, detectSessionInUrl, localStorage, headers, fetch, cookieOptions, multiTab, }) {
        const authHeaders = {
            Authorization: `Bearer ${this.supabaseKey}`,
            apikey: `${this.supabaseKey}`,
        };
        return new SupabaseAuthClient_1.SupabaseAuthClient({
            url: this.authUrl,
            headers: Object.assign(Object.assign({}, headers), authHeaders),
            autoRefreshToken,
            persistSession,
            detectSessionInUrl,
            localStorage,
            fetch,
            cookieOptions,
            multiTab,
        });
    }
    _initPostgRESTClient() {
        return new index_3.PostgrestClient(this.restUrl, {
            headers: this._getAuthHeaders(),
            schema: this.schema,
            fetch: this.fetch,
            throwOnError: this.shouldThrowOnError,
        });
    }
    _getAuthHeaders() {
        var _a, _b;
        const headers = Object.assign({}, this.headers);
        const authBearer = (_b = (_a = this.auth.session()) === null || _a === void 0 ? void 0 : _a.access_token) !== null && _b !== void 0 ? _b : this.supabaseKey;
        headers['apikey'] = this.supabaseKey;
        headers['Authorization'] = headers['Authorization'] || `Bearer ${authBearer}`;
        return headers;
    }
    _listenForMultiTabEvents() {
        if (!this.multiTab || !(0, helpers_1.isBrowser)() || !(window === null || window === void 0 ? void 0 : window.addEventListener)) {
            return null;
        }
        try {
            return window === null || window === void 0 ? void 0 : window.addEventListener('storage', (e) => {
                var _a, _b, _c;
                if (e.key === constants_1.STORAGE_KEY) {
                    const newSession = JSON.parse(String(e.newValue));
                    const accessToken = (_b = (_a = newSession === null || newSession === void 0 ? void 0 : newSession.currentSession) === null || _a === void 0 ? void 0 : _a.access_token) !== null && _b !== void 0 ? _b : undefined;
                    const previousAccessToken = (_c = this.auth.session()) === null || _c === void 0 ? void 0 : _c.access_token;
                    if (!accessToken) {
                        this._handleTokenChanged('SIGNED_OUT', accessToken, 'STORAGE');
                    }
                    else if (!previousAccessToken && accessToken) {
                        this._handleTokenChanged('SIGNED_IN', accessToken, 'STORAGE');
                    }
                    else if (previousAccessToken !== accessToken) {
                        this._handleTokenChanged('TOKEN_REFRESHED', accessToken, 'STORAGE');
                    }
                }
            });
        }
        catch (error) {
            console.error('_listenForMultiTabEvents', error);
            return null;
        }
    }
    _listenForAuthEvents() {
        let { data } = this.auth.onAuthStateChange((event, session) => {
            this._handleTokenChanged(event, session === null || session === void 0 ? void 0 : session.access_token, 'CLIENT');
        });
        return data;
    }
    _handleTokenChanged(event, token, source) {
        if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') &&
            this.changedAccessToken !== token) {
            // Token has changed
            // Ideally we should call this.auth.recoverSession() - need to make public
            // to trigger a "SIGNED_IN" event on this client.
            if (source == 'STORAGE')
                this.auth.setAuth(token);
            this.changedAccessToken = token;
        }
        else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            // Token is removed
            if (source == 'STORAGE')
                this.auth.signOut();
        }
    }
}
exports.default = SupabaseClient;
//# sourceMappingURL=SupabaseClient.js.map