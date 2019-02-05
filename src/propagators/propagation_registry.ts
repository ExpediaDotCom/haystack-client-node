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

import {Propagator} from './propagator';
import TextMapPropagator from './textmap_propagator';
import URLCodex from './url_codex';
import * as opentracing from 'opentracing';
import BinaryPropagator from './binary_propagator';

export default class PropagationRegistry {
    private _propagators: any;

    constructor() {
        this._propagators = {};
    }

    register(format: string, propagator: Propagator): PropagationRegistry {
        this._propagators[format] = propagator;
        return this;
    }

    propagator(format): Propagator {
        return this._propagators[format];
    }

    static default(): PropagationRegistry {
        return new PropagationRegistry()
            .register(opentracing.FORMAT_TEXT_MAP, new TextMapPropagator())
            .register(opentracing.FORMAT_BINARY, new BinaryPropagator())
            .register(opentracing.FORMAT_HTTP_HEADERS, new TextMapPropagator(new URLCodex()));
    }
}
