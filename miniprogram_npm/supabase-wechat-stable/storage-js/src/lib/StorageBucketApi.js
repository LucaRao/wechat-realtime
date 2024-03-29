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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageBucketApi = void 0;
const constants_1 = require("./constants");
const helpers_1 = require("./helpers");
let _fetch = require('wefetch');
class StorageBucketApi {
    constructor(url, headers = {}, fetch) {
        this.url = url;
        this.headers = Object.assign(Object.assign({}, constants_1.DEFAULT_HEADERS), headers);
        this.fetch = (0, helpers_1.resolveFetch)(fetch);
    }
    /**
     * Retrieves the details of all Storage buckets within an existing project.
     */
    listBuckets() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield _fetch(`${this.url}/bucket`, { header: this.headers, method: 'GET' });
                return { data, error: null };
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
    /**
     * Retrieves the details of an existing Storage bucket.
     *
     * @param id The unique identifier of the bucket you would like to retrieve.
     */
    getBucket(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield _fetch(`${this.url}/bucket/${id}`, { header: this.headers, method: 'GET' });
                return { data, error: null };
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
    /**
     * Creates a new Storage bucket
     *
     * @param id A unique identifier for the bucket you are creating.
     * @returns newly created bucket id
     */
    createBucket(id, options = { public: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield _fetch(`${this.url}/bucket`, { id, name: id, public: options.public }, { header: this.headers, method: 'POST' });
                return { data: data.name, error: null };
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
    /**
     * Updates a new Storage bucket
     *
     * @param id A unique identifier for the bucket you are updating.
     */
    updateBucket(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield _fetch(`${this.url}/bucket/${id}`, { id, name: id, public: options.public }, { header: this.headers, method: 'PUT' });
                return { data, error: null };
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
    /**
     * Removes all objects inside a single bucket.
     *
     * @param id The unique identifier of the bucket you would like to empty.
     */
    emptyBucket(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield _fetch(`${this.url}/bucket/${id}/empty`, {}, { header: this.headers, method: 'POST' });
                return { data, error: null };
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
    /**
     * Deletes an existing bucket. A bucket can't be deleted with existing objects inside it.
     * You must first `empty()` the bucket.
     *
     * @param id The unique identifier of the bucket you would like to delete.
     */
    deleteBucket(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield _fetch(`${this.url}/bucket/${id}`, {}, { header: this.headers, method: 'DELETE' });
                return { data, error: null };
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
}
exports.StorageBucketApi = StorageBucketApi;
//# sourceMappingURL=StorageBucketApi.js.map