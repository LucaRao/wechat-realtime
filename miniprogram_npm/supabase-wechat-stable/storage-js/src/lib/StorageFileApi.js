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
exports.StorageFileApi = void 0;
const helpers_1 = require("./helpers");
let _fetch = require('wefetch');
const DEFAULT_SEARCH_OPTIONS = {
    limit: 100,
    offset: 0,
    sortBy: {
        column: 'name',
        order: 'asc',
    },
};
const DEFAULT_FILE_OPTIONS = {
    cacheControl: '3600',
    contentType: 'text/plain;charset=UTF-8',
    upsert: false,
};
class StorageFileApi {
    constructor(url, headers = {}, bucketId, fetch) {
        this.url = url;
        this.headers = headers;
        this.bucketId = bucketId;
        this.fetch = (0, helpers_1.resolveFetch)(fetch);
    }
    /**
     * Uploads a file to an existing bucket or replaces an existing file at the specified path with a new one.
     *
     * @param method HTTP method.
     * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
     * @param fileBody The body of the file to be stored in the bucket.
     * @param fileOptions HTTP headers.
     * `cacheControl`: string, the `Cache-Control: max-age=<seconds>` seconds value.
     * `contentType`: string, the `Content-Type` header value. Should be specified if using a `fileBody` that is neither `Blob` nor `File` nor `FormData`, otherwise will default to `text/plain;charset=UTF-8`.
     * `upsert`: boolean, whether to perform an upsert.
     */
    uploadOrUpdate(method, path, fileBody, fileOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let body;
                const options = Object.assign(Object.assign({}, DEFAULT_FILE_OPTIONS), fileOptions);
                const headers = Object.assign(Object.assign({}, this.headers), (method === 'POST' && { 'x-upsert': String(options.upsert) }));
                // if (typeof Blob !== 'undefined' && fileBody instanceof Blob) {
                //   body = new FormData()
                //   body.append('cacheControl', options.cacheControl as string)
                //   body.append('', fileBody)
                // } else if (typeof FormData !== 'undefined' && fileBody instanceof FormData) {
                //   body = fileBody
                //   body.append('cacheControl', options.cacheControl as string)
                // } else {
                //   body = fileBody
                //   headers['cache-control'] = `max-age=${options.cacheControl}`
                //   headers['content-type'] = options.contentType as string
                // }
                const cleanPath = this._removeEmptyFolders(path);
                const _path = this._getFinalPath(path);
                const FormData = require('./formData.js');
                let formData = new FormData();
                formData.append('name', 'value');
                formData.appendFile('file', fileBody.tempFilePath, path);
                let data = formData.getData();
                headers['content-type'] = data.contentType;
                const res = yield _fetch(`${this.url}/object/${_path}`, {
                    method,
                    data: data.buffer,
                    header: headers,
                });
                if (res.statusCode == 200) {
                    // const data = await res.json()
                    // temporary fix till backend is updated to the latest storage-api version
                    return { data: { Key: _path }, error: null };
                }
                else {
                    const error = yield res;
                    return { data: null, error };
                }
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
    /**
     * Uploads a file to an existing bucket.
     *
     * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
     * @param fileBody The body of the file to be stored in the bucket.
     * @param fileOptions HTTP headers.
     * `cacheControl`: string, the `Cache-Control: max-age=<seconds>` seconds value.
     * `contentType`: string, the `Content-Type` header value. Should be specified if using a `fileBody` that is neither `Blob` nor `File` nor `FormData`, otherwise will default to `text/plain;charset=UTF-8`.
     * `upsert`: boolean, whether to perform an upsert.
     */
    upload(path, fileBody, fileOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.uploadOrUpdate('POST', path, fileBody, fileOptions);
        });
    }
    /**
     * Replaces an existing file at the specified path with a new one.
     *
     * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
     * @param fileBody The body of the file to be stored in the bucket.
     * @param fileOptions HTTP headers.
     * `cacheControl`: string, the `Cache-Control: max-age=<seconds>` seconds value.
     * `contentType`: string, the `Content-Type` header value. Should be specified if using a `fileBody` that is neither `Blob` nor `File` nor `FormData`, otherwise will default to `text/plain;charset=UTF-8`.
     * `upsert`: boolean, whether to perform an upsert.
     */
    update(path, fileBody, fileOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.uploadOrUpdate('PUT', path, fileBody, fileOptions);
        });
    }
    /**
     * Moves an existing file.
     *
     * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
     * @param toPath The new file path, including the new file name. For example `folder/image-new.png`.
     */
    move(fromPath, toPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield _fetch(`${this.url}/object/move`, { bucketId: this.bucketId, sourceKey: fromPath, destinationKey: toPath }, { header: this.headers, method: 'POST' });
                return { data, error: null };
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
    /**
     * Copies an existing file.
     *
     * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
     * @param toPath The new file path, including the new file name. For example `folder/image-copy.png`.
     */
    copy(fromPath, toPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield _fetch(`${this.url}/object/copy`, { bucketId: this.bucketId, sourceKey: fromPath, destinationKey: toPath }, { header: this.headers, method: 'POST' });
                return { data, error: null };
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
    /**
     * Create signed URL to download file without requiring permissions. This URL can be valid for a set number of seconds.
     *
     * @param path The file path to be downloaded, including the current file name. For example `folder/image.png`.
     * @param expiresIn The number of seconds until the signed URL expires. For example, `60` for a URL which is valid for one minute.
     */
    createSignedUrl(path, expiresIn) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _path = this._getFinalPath(path);
                let data = yield _fetch(`${this.url}/object/sign/${_path}`, { expiresIn }, { header: this.headers });
                const signedURL = `${this.url}${data.signedURL}`;
                data = { signedURL };
                return { data, error: null, signedURL };
            }
            catch (error) {
                return { data: null, error, signedURL: null };
            }
        });
    }
    /**
     * Create signed URLs to download files without requiring permissions. These URLs can be valid for a set number of seconds.
     *
     * @param paths The file paths to be downloaded, including the current file names. For example `['folder/image.png', 'folder2/image2.png']`.
     * @param expiresIn The number of seconds until the signed URLs expire. For example, `60` for URLs which are valid for one minute.
     */
    createSignedUrls(paths, expiresIn) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield _fetch(`${this.url}/object/sign/${this.bucketId}`, { expiresIn, paths }, { header: this.headers });
                return {
                    data: data.map((datum) => (Object.assign(Object.assign({}, datum), { signedURL: datum.signedURL ? `${this.url}${datum.signedURL}` : null }))),
                    error: null,
                };
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
    /**
     * Downloads a file.
     *
     * @param path The file path to be downloaded, including the path and file name. For example `folder/image.png`.
     */
    download(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _path = this._getFinalPath(path);
                const res = `${this.url}/object/public/${_path}`;
                const data = res;
                return { data, error: null };
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
    /**
     * Retrieve URLs for assets in public buckets
     *
     * @param path The file path to be downloaded, including the path and file name. For example `folder/image.png`.
     */
    getPublicUrl(path) {
        try {
            const _path = this._getFinalPath(path);
            const publicURL = `${this.url}/object/public/${_path}`;
            const data = { publicURL };
            return { data, error: null, publicURL };
        }
        catch (error) {
            return { data: null, error, publicURL: null };
        }
    }
    /**
     * Deletes files within the same bucket
     *
     * @param paths An array of files to be deleted, including the path and file name. For example [`folder/image.png`].
     */
    remove(paths) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield _fetch(`${this.url}/object/${this.bucketId}`, { prefixes: paths }, { header: this.headers, method: 'DELETE' });
                return { data, error: null };
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
    /**
     * Get file metadata
     * @param id the file id to retrieve metadata
     */
    // async getMetadata(id: string): Promise<{ data: Metadata | null; error: Error | null }> {
    //   try {
    //     const data = await _fetch(`${this.url}/metadata/${id}`, { headers: this.headers })
    //     return { data, error: null }
    //   } catch (error) {
    //     return { data: null, error }
    //   }
    // }
    /**
     * Update file metadata
     * @param id the file id to update metadata
     * @param meta the new file metadata
     */
    // async updateMetadata(
    //   id: string,
    //   meta: Metadata
    // ): Promise<{ data: Metadata | null; error: Error | null }> {
    //   try {
    //     const data = await _fetch(`${this.url}/metadata/${id}`, { ...meta }, { headers: this.headers })
    //     return { data, error: null }
    //   } catch (error) {
    //     return { data: null, error }
    //   }
    // }
    /**
     * Lists all the files within a bucket.
     * @param path The folder path.
     * @param options Search options, including `limit`, `offset`, `sortBy`, and `search`.
     * @param parameters Fetch parameters, currently only supports `signal`, which is an AbortController's signal
     */
    list(path, options, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const body = Object.assign(Object.assign(Object.assign({}, DEFAULT_SEARCH_OPTIONS), options), { prefix: path || '' });
                const data = yield _fetch(`${this.url}/object/list/${this.bucketId}`, { data: body }, { header: this.headers, method: 'POST', data: body }, parameters);
                return { data, error: null };
            }
            catch (error) {
                return { data: null, error };
            }
        });
    }
    _getFinalPath(path) {
        return `${this.bucketId}/${path}`;
    }
    _removeEmptyFolders(path) {
        return path.replace(/^\/|\/$/g, '').replace(/\/+/g, '/');
    }
}
exports.StorageFileApi = StorageFileApi;
//# sourceMappingURL=StorageFileApi.js.map