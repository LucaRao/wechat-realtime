"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GoTrueApi_1 = __importDefault(require("./GoTrueApi"));
const helpers_1 = require("./lib/helpers");
const constants_1 = require("./lib/constants");
const polyfills_1 = require("./lib/polyfills");
(0, polyfills_1.polyfillGlobalThis)(); // Make "globalThis" available
const DEFAULT_OPTIONS = {
    url: constants_1.GOTRUE_URL,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    multiTab: true,
    headers: constants_1.DEFAULT_HEADERS,
};
class GoTrueClient {
    /**
     * Create a new client for use in the browser.
     * @param options.url The URL of the GoTrue server.
     * @param options.headers Any additional headers to send to the GoTrue server.
     * @param options.detectSessionInUrl Set to "true" if you want to automatically detects OAuth grants in the URL and signs in the user.
     * @param options.autoRefreshToken Set to "true" if you want to automatically refresh the token before expiring.
     * @param options.persistSession Set to "true" if you want to automatically save the user session into local storage.
     * @param options.localStorage Provide your own local storage implementation to use instead of the browser's local storage.
     * @param options.multiTab Set to "false" if you want to disable multi-tab/window events.
     * @param options.cookieOptions
     * @param options.fetch A custom fetch implementation.
     */
    constructor(options) {
        this.stateChangeEmitters = new Map();
        this.networkRetries = 0;
        const settings = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
        this.currentUser = null;
        this.currentSession = null;
        this.autoRefreshToken = settings.autoRefreshToken;
        this.persistSession = settings.persistSession;
        this.multiTab = settings.multiTab;
        this.localStorage = settings.localStorage || globalThis.localStorage;
        this.api = new GoTrueApi_1.default({
            url: settings.url,
            headers: settings.headers,
            cookieOptions: settings.cookieOptions,
            fetch: settings.fetch,
        });
        this._recoverSession();
        this._recoverAndRefresh();
        this._listenForMultiTabEvents();
        this._handleVisibilityChange();
        if (settings.detectSessionInUrl && (0, helpers_1.isBrowser)() && !!(0, helpers_1.getParameterByName)('access_token')) {
            // Handle the OAuth redirect
            this.getSessionFromUrl({ storeSession: true }).then(({ error }) => {
                if (error) {
                    throw new Error('Error getting session from URL.');
                }
            });
        }
    }
    /**
     * Creates a new user.
     * @type UserCredentials
     * @param email The user's email address.
     * @param password The user's password.
     * @param phone The user's phone number.
     * @param redirectTo The redirect URL attached to the signup confirmation link. Does not redirect the user if it's a mobile signup.
     * @param data Optional user metadata.
     */
    signUp({ email, password, phone }, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._removeSession();
                const { data, error } = phone && password
                    ? yield this.api.signUpWithPhone(phone, password, {
                        data: options.data,
                        captchaToken: options.captchaToken,
                    })
                    : yield this.api.signUpWithEmail(email, password, {
                        redirectTo: options.redirectTo,
                        data: options.data,
                        captchaToken: options.captchaToken,
                    });
                if (error) {
                    throw error;
                }
                if (!data) {
                    throw 'An error occurred on sign up.';
                }
                let session = null;
                let user = null;
                if (data.access_token) {
                    session = data;
                    user = session.user;
                    this._saveSession(session);
                    this._notifyAllSubscribers('SIGNED_IN');
                }
                if (data.id) {
                    user = data;
                }
                return { data, user, session, error: null };
            }
            catch (e) {
                return { data: null, user: null, session: null, error: e };
            }
        });
    }
    /**
     * Log in an existing user, or login via a third-party provider.
     * @type UserCredentials
     * @param email The user's email address.
     * @param phone The user's phone number.
     * @param password The user's password.
     * @param refreshToken A valid refresh token that was returned on login.
     * @param provider One of the providers supported by GoTrue.
     * @param redirectTo A URL to send the user to after they are confirmed (OAuth logins only).
     * @param shouldCreateUser A boolean flag to indicate whether to automatically create a user on magiclink / otp sign-ins if the user doesn't exist. Defaults to true.
     * @param scopes A space-separated list of scopes granted to the OAuth application.
     */
    signIn({ email, phone, password, refreshToken, provider, oidc }, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._removeSession();
                if (email && !password) {
                    const { error } = yield this.api.sendMagicLinkEmail(email, {
                        redirectTo: options.redirectTo,
                        shouldCreateUser: options.shouldCreateUser,
                        captchaToken: options.captchaToken,
                    });
                    return { data: null, user: null, session: null, error };
                }
                if (email && password) {
                    return this._handleEmailSignIn(email, password, {
                        redirectTo: options.redirectTo,
                        captchaToken: options.captchaToken,
                    });
                }
                if (phone && !password) {
                    const { error } = yield this.api.sendMobileOTP(phone, {
                        shouldCreateUser: options.shouldCreateUser,
                        captchaToken: options.captchaToken,
                    });
                    return { data: null, user: null, session: null, error };
                }
                if (phone && password) {
                    return this._handlePhoneSignIn(phone, password);
                }
                if (refreshToken) {
                    // currentSession and currentUser will be updated to latest on _callRefreshToken using the passed refreshToken
                    const { error } = yield this._callRefreshToken(refreshToken);
                    if (error)
                        throw error;
                    return {
                        data: this.currentSession,
                        user: this.currentUser,
                        session: this.currentSession,
                        error: null,
                    };
                }
                if (provider) {
                    return this._handleProviderSignIn(provider, {
                        redirectTo: options.redirectTo,
                        scopes: options.scopes,
                        queryParams: options.queryParams,
                    });
                }
                if (oidc) {
                    return this._handleOpenIDConnectSignIn(oidc);
                }
                throw new Error(`You must provide either an email, phone number, a third-party provider or OpenID Connect.`);
            }
            catch (e) {
                return { data: null, user: null, session: null, error: e };
            }
        });
    }
    /**
     * Log in a user given a User supplied OTP received via mobile.
     * @param email The user's email address.
     * @param phone The user's phone number.
     * @param token The user's password.
     * @param type The user's verification type.
     * @param redirectTo A URL or mobile address to send the user to after they are confirmed.
     */
    verifyOTP(params, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._removeSession();
                const { data, error } = yield this.api.verifyOTP(params, options);
                if (error) {
                    throw error;
                }
                if (!data) {
                    throw 'An error occurred on token verification.';
                }
                let session = null;
                let user = null;
                if (data.access_token) {
                    session = data;
                    user = session.user;
                    this._saveSession(session);
                    this._notifyAllSubscribers('SIGNED_IN');
                }
                if (data.id) {
                    user = data;
                }
                return { data, user, session, error: null };
            }
            catch (e) {
                return { data: null, user: null, session: null, error: e };
            }
        });
    }
    /**
     * Inside a browser context, `user()` will return the user data, if there is a logged in user.
     *
     * For server-side management, you can get a user through `auth.api.getUserByCookie()`
     */
    user() {
        return this.currentUser;
    }
    /**
     * Returns the session data, if there is an active session.
     */
    session() {
        return this.currentSession;
    }
    /**
     * Force refreshes the session including the user data in case it was updated in a different session.
     */
    refreshSession() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!((_a = this.currentSession) === null || _a === void 0 ? void 0 : _a.access_token))
                    throw new Error('Not logged in.');
                // currentSession and currentUser will be updated to latest on _callRefreshToken
                const { error } = yield this._callRefreshToken();
                if (error)
                    throw error;
                return { data: this.currentSession, user: this.currentUser, error: null };
            }
            catch (e) {
                return { data: null, user: null, error: e };
            }
        });
    }
    /**
     * Updates user data, if there is a logged in user.
     */
    update(attributes) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!((_a = this.currentSession) === null || _a === void 0 ? void 0 : _a.access_token))
                    throw new Error('Not logged in.');
                const { user, error } = yield this.api.updateUser(this.currentSession.access_token, attributes);
                if (error)
                    throw error;
                if (!user)
                    throw Error('Invalid user data.');
                const session = Object.assign(Object.assign({}, this.currentSession), { user });
                this._saveSession(session);
                this._notifyAllSubscribers('USER_UPDATED');
                return { data: user, user, error: null };
            }
            catch (e) {
                return { data: null, user: null, error: e };
            }
        });
    }
    /**
     * Sets the session data from refresh_token and returns current Session and Error
     * @param refresh_token a JWT token
     */
    setSession(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!refresh_token) {
                    throw new Error('No current session.');
                }
                const { data, error } = yield this.api.refreshAccessToken(refresh_token);
                if (error) {
                    return { session: null, error: error };
                }
                this._saveSession(data);
                this._notifyAllSubscribers('SIGNED_IN');
                return { session: data, error: null };
            }
            catch (e) {
                return { error: e, session: null };
            }
        });
    }
    /**
     * Overrides the JWT on the current client. The JWT will then be sent in all subsequent network requests.
     * @param access_token a jwt access token
     */
    setAuth(access_token) {
        this.currentSession = Object.assign(Object.assign({}, this.currentSession), { access_token, token_type: 'bearer', user: this.user() });
        this._notifyAllSubscribers('TOKEN_REFRESHED');
        return this.currentSession;
    }
    /**
     * Gets the session data from a URL string
     * @param options.storeSession Optionally store the session in the browser
     */
    getSessionFromUrl(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!(0, helpers_1.isBrowser)())
                    throw new Error('No browser detected.');
                const error_description = (0, helpers_1.getParameterByName)('error_description');
                if (error_description)
                    throw new Error(error_description);
                const provider_token = (0, helpers_1.getParameterByName)('provider_token');
                const access_token = (0, helpers_1.getParameterByName)('access_token');
                if (!access_token)
                    throw new Error('No access_token detected.');
                const expires_in = (0, helpers_1.getParameterByName)('expires_in');
                if (!expires_in)
                    throw new Error('No expires_in detected.');
                const refresh_token = (0, helpers_1.getParameterByName)('refresh_token');
                if (!refresh_token)
                    throw new Error('No refresh_token detected.');
                const token_type = (0, helpers_1.getParameterByName)('token_type');
                if (!token_type)
                    throw new Error('No token_type detected.');
                const timeNow = Math.round(Date.now() / 1000);
                const expires_at = timeNow + parseInt(expires_in);
                const { user, error } = yield this.api.getUser(access_token);
                if (error)
                    throw error;
                const session = {
                    provider_token,
                    access_token,
                    expires_in: parseInt(expires_in),
                    expires_at,
                    refresh_token,
                    token_type,
                    user: user,
                };
                if (options === null || options === void 0 ? void 0 : options.storeSession) {
                    this._saveSession(session);
                    const recoveryMode = (0, helpers_1.getParameterByName)('type');
                    this._notifyAllSubscribers('SIGNED_IN');
                    if (recoveryMode === 'recovery') {
                        this._notifyAllSubscribers('PASSWORD_RECOVERY');
                    }
                }
                // Remove tokens from URL
                window.location.hash = '';
                return { data: session, error: null };
            }
            catch (e) {
                return { data: null, error: e };
            }
        });
    }
    /**
     * Inside a browser context, `signOut()` will remove the logged in user from the browser session
     * and log them out - removing all items from localstorage and then trigger a "SIGNED_OUT" event.
     *
     * For server-side management, you can revoke all refresh tokens for a user by passing a user's JWT through to `auth.api.signOut(JWT: string)`. There is no way to revoke a user's session JWT before it automatically expires
     */
    signOut() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const accessToken = (_a = this.currentSession) === null || _a === void 0 ? void 0 : _a.access_token;
            this._removeSession();
            this._notifyAllSubscribers('SIGNED_OUT');
            if (accessToken) {
                const { error } = yield this.api.signOut(accessToken);
                if (error)
                    return { error };
            }
            return { error: null };
        });
    }
    /**
     * Receive a notification every time an auth event happens.
     * @returns {Subscription} A subscription object which can be used to unsubscribe itself.
     */
    onAuthStateChange(callback) {
        try {
            const id = (0, helpers_1.uuid)();
            const subscription = {
                id,
                callback,
                unsubscribe: () => {
                    this.stateChangeEmitters.delete(id);
                },
            };
            this.stateChangeEmitters.set(id, subscription);
            return { data: subscription, error: null };
        }
        catch (e) {
            return { data: null, error: e };
        }
    }
    _handleEmailSignIn(email, password, options = {}) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield this.api.signInWithEmail(email, password, {
                    redirectTo: options.redirectTo,
                    captchaToken: options.captchaToken,
                });
                if (error || !data)
                    return { data: null, user: null, session: null, error };
                if (((_a = data === null || data === void 0 ? void 0 : data.user) === null || _a === void 0 ? void 0 : _a.confirmed_at) || ((_b = data === null || data === void 0 ? void 0 : data.user) === null || _b === void 0 ? void 0 : _b.email_confirmed_at)) {
                    this._saveSession(data);
                    this._notifyAllSubscribers('SIGNED_IN');
                }
                return { data, user: data.user, session: data, error: null };
            }
            catch (e) {
                return { data: null, user: null, session: null, error: e };
            }
        });
    }
    _handlePhoneSignIn(phone, password, options = {}) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield this.api.signInWithPhone(phone, password, options);
                if (error || !data)
                    return { data: null, user: null, session: null, error };
                if ((_a = data === null || data === void 0 ? void 0 : data.user) === null || _a === void 0 ? void 0 : _a.phone_confirmed_at) {
                    this._saveSession(data);
                    this._notifyAllSubscribers('SIGNED_IN');
                }
                return { data, user: data.user, session: data, error: null };
            }
            catch (e) {
                return { data: null, user: null, session: null, error: e };
            }
        });
    }
    _handleProviderSignIn(provider, options = {}) {
        const url = this.api.getUrlForProvider(provider, {
            redirectTo: options.redirectTo,
            scopes: options.scopes,
            queryParams: options.queryParams,
        });
        try {
            // try to open on the browser
            if ((0, helpers_1.isBrowser)()) {
                window.location.href = url;
            }
            return { provider, url, data: null, session: null, user: null, error: null };
        }
        catch (e) {
            // fallback to returning the URL
            if (url)
                return { provider, url, data: null, session: null, user: null, error: null };
            return { data: null, user: null, session: null, error: e };
        }
    }
    _handleOpenIDConnectSignIn({ id_token, nonce, client_id, issuer, provider, }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (id_token && nonce && ((client_id && issuer) || provider)) {
                try {
                    const { data, error } = yield this.api.signInWithOpenIDConnect({
                        id_token,
                        nonce,
                        client_id,
                        issuer,
                        provider,
                    });
                    if (error || !data)
                        return { data: null, user: null, session: null, error };
                    this._saveSession(data);
                    this._notifyAllSubscribers('SIGNED_IN');
                    return { data: data, user: data.user, session: data, error: null };
                }
                catch (e) {
                    return { data: null, user: null, session: null, error: e };
                }
            }
            throw new Error(`You must provide a OpenID Connect provider with your id token and nonce.`);
        });
    }
    /**
     * Attempts to get the session from LocalStorage
     * Note: this should never be async (even for React Native), as we need it to return immediately in the constructor.
     */
    _recoverSession() {
        try {
            const data = (0, helpers_1.getItemSynchronously)(this.localStorage, constants_1.STORAGE_KEY);
            if (!data)
                return null;
            const { currentSession, expiresAt } = data;
            const timeNow = Math.round(Date.now() / 1000);
            if (expiresAt >= timeNow + constants_1.EXPIRY_MARGIN && (currentSession === null || currentSession === void 0 ? void 0 : currentSession.user)) {
                this._saveSession(currentSession);
                this._notifyAllSubscribers('SIGNED_IN');
            }
        }
        catch (error) {
            console.log('error', error);
        }
    }
    /**
     * Recovers the session from LocalStorage and refreshes
     * Note: this method is async to accommodate for AsyncStorage e.g. in React native.
     */
    _recoverAndRefresh() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, helpers_1.getItemAsync)(this.localStorage, constants_1.STORAGE_KEY);
                if (!data)
                    return null;
                const { currentSession, expiresAt } = data;
                const timeNow = Math.round(Date.now() / 1000);
                if (expiresAt < timeNow + constants_1.EXPIRY_MARGIN) {
                    if (this.autoRefreshToken && currentSession.refresh_token) {
                        this.networkRetries++;
                        const { error } = yield this._callRefreshToken(currentSession.refresh_token);
                        if (error) {
                            console.log(error.message);
                            if (error.message === constants_1.NETWORK_FAILURE.ERROR_MESSAGE &&
                                this.networkRetries < constants_1.NETWORK_FAILURE.MAX_RETRIES) {
                                if (this.refreshTokenTimer)
                                    clearTimeout(this.refreshTokenTimer);
                                this.refreshTokenTimer = setTimeout(() => this._recoverAndRefresh(), Math.pow(constants_1.NETWORK_FAILURE.RETRY_INTERVAL, this.networkRetries) * 100 // exponential backoff
                                );
                                return;
                            }
                            yield this._removeSession();
                        }
                        this.networkRetries = 0;
                    }
                    else {
                        this._removeSession();
                    }
                }
                else if (!currentSession) {
                    console.log('Current session is missing data.');
                    this._removeSession();
                }
                else {
                    // should be handled on _recoverSession method already
                    // But we still need the code here to accommodate for AsyncStorage e.g. in React native
                    this._saveSession(currentSession);
                    this._notifyAllSubscribers('SIGNED_IN');
                }
            }
            catch (err) {
                console.error(err);
                return null;
            }
        });
    }
    _callRefreshToken(refresh_token) {
        var _a;
        if (refresh_token === void 0) { refresh_token = (_a = this.currentSession) === null || _a === void 0 ? void 0 : _a.refresh_token; }
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!refresh_token) {
                    throw new Error('No current session.');
                }
                const { data, error } = yield this.api.refreshAccessToken(refresh_token);
                if (error)
                    throw error;
                if (!data)
                    throw Error('Invalid session data.');
                this._saveSession(data);
                this._notifyAllSubscribers('TOKEN_REFRESHED');
                this._notifyAllSubscribers('SIGNED_IN');
                return { data, error: null };
            }
            catch (e) {
                return { data: null, error: e };
            }
        });
    }
    _notifyAllSubscribers(event) {
        this.stateChangeEmitters.forEach((x) => x.callback(event, this.currentSession));
    }
    /**
     * set currentSession and currentUser
     * process to _startAutoRefreshToken if possible
     */
    _saveSession(session) {
        this.currentSession = session;
        this.currentUser = session.user;
        const expiresAt = session.expires_at;
        if (expiresAt) {
            const timeNow = Math.round(Date.now() / 1000);
            const expiresIn = expiresAt - timeNow;
            const refreshDurationBeforeExpires = expiresIn > constants_1.EXPIRY_MARGIN ? constants_1.EXPIRY_MARGIN : 0.5;
            this._startAutoRefreshToken((expiresIn - refreshDurationBeforeExpires) * 1000);
        }
        // Do we need any extra check before persist session
        // access_token or user ?
        if (this.persistSession && session.expires_at) {
            this._persistSession(this.currentSession);
        }
    }
    _persistSession(currentSession) {
        const data = { currentSession, expiresAt: currentSession.expires_at };
        (0, helpers_1.setItemAsync)(this.localStorage, constants_1.STORAGE_KEY, data);
    }
    _removeSession() {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentSession = null;
            this.currentUser = null;
            if (this.refreshTokenTimer)
                clearTimeout(this.refreshTokenTimer);
            (0, helpers_1.removeItemAsync)(this.localStorage, constants_1.STORAGE_KEY);
        });
    }
    /**
     * Clear and re-create refresh token timer
     * @param value time intervals in milliseconds
     */
    _startAutoRefreshToken(value) {
        if (this.refreshTokenTimer)
            clearTimeout(this.refreshTokenTimer);
        if (value <= 0 || !this.autoRefreshToken)
            return;
        this.refreshTokenTimer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            this.networkRetries++;
            const { error } = yield this._callRefreshToken();
            if (!error)
                this.networkRetries = 0;
            if ((error === null || error === void 0 ? void 0 : error.message) === constants_1.NETWORK_FAILURE.ERROR_MESSAGE &&
                this.networkRetries < constants_1.NETWORK_FAILURE.MAX_RETRIES)
                this._startAutoRefreshToken(Math.pow(constants_1.NETWORK_FAILURE.RETRY_INTERVAL, this.networkRetries) * 100); // exponential backoff
        }), value);
        if (typeof this.refreshTokenTimer.unref === 'function')
            this.refreshTokenTimer.unref();
    }
    /**
     * Listens for changes to LocalStorage and updates the current session.
     */
    _listenForMultiTabEvents() {
        if (!this.multiTab || !(0, helpers_1.isBrowser)() || !(window === null || window === void 0 ? void 0 : window.addEventListener)) {
            return false;
        }
        try {
            window === null || window === void 0 ? void 0 : window.addEventListener('storage', (e) => {
                var _a;
                if (e.key === constants_1.STORAGE_KEY) {
                    const newSession = JSON.parse(String(e.newValue));
                    if ((_a = newSession === null || newSession === void 0 ? void 0 : newSession.currentSession) === null || _a === void 0 ? void 0 : _a.access_token) {
                        this._saveSession(newSession.currentSession);
                        this._notifyAllSubscribers('SIGNED_IN');
                    }
                    else {
                        this._removeSession();
                        this._notifyAllSubscribers('SIGNED_OUT');
                    }
                }
            });
        }
        catch (error) {
            console.error('_listenForMultiTabEvents', error);
        }
    }
    _handleVisibilityChange() {
        if (!this.multiTab || !(0, helpers_1.isBrowser)() || !(window === null || window === void 0 ? void 0 : window.addEventListener)) {
            return false;
        }
        try {
            window === null || window === void 0 ? void 0 : window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this._recoverAndRefresh();
                }
            });
        }
        catch (error) {
            console.error('_handleVisibilityChange', error);
        }
    }
}
exports.default = GoTrueClient;
//# sourceMappingURL=GoTrueClient.js.map