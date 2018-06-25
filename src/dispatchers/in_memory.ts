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

import Span from '../span';
import {Dispatcher} from './dispatcher';

export default class InMemoryDispatcher implements Dispatcher {
    _spans: Span[];

    constructor() {
        this._spans = [];
    }

    name(): string {
        return 'InMemoryDispatcher';
    }

    dispatch(span: Span, callback: (error) => void): void {
        this._spans.push(span);
        if (callback) {
            callback(null);
        }
    }

    close(callback: () => void): void {
        if (callback) {
            callback();
        }
    }
}
