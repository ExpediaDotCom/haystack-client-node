
/*
 *  Copyright 2018 Expedia, Inc.
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

import {Dispatcher} from './dispatcher';
import Span from '../span';
import { Logger, NullLogger } from '../logger';
import Utils from '../utils';
import {CoreOptions, Response} from 'request';
import * as request from 'request';

export default class HttpCollectorDispatcher implements Dispatcher {
    _collectorUrl: string;
    _headers: { [key: string]: any };
    _logger: Logger;

    constructor(_collectorUrl: string = 'http://localhost:8080/span', headers: { [key: string]: any } = {}, logger: Logger = new NullLogger()) {
        this._collectorUrl = _collectorUrl;
        this._headers = headers;
        this._logger = logger;
        this._logger.info(`Initializing the http collector dispatcher, connecting at ${_collectorUrl}`);
    }

    name(): string {
        return 'HttpCollectorDispatcher';
    }

    dispatch(span: Span, callback: (error) => void): void {
        const serializedSpanBuffer = Utils.convertToProtoSpan(span).serializeBinary();
        const options: CoreOptions = {};
        options.headers = this._headers;
        options.body = serializedSpanBuffer;
        request.post(this._collectorUrl, options, (error: any, response: Response, body: any) => {
            if (error) {
                this._logger.error(`Fail to dipatch to http collector with error ${error}`);
                return;
            }
            if (response.statusCode < 200 || response.statusCode >= 300) {
                this._logger.error(`Fail to dispatch to http collector with statusCode ${response.statusCode} and response ${body}`);
                return;
            }
            this._logger.debug(`successfully submitted the span to http collector with http response: ${body}`);
        });
    }

    close(callback: () => void): void {
        if (callback) {
            callback();
        }
    }
}
