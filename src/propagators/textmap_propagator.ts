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

import {Codex, Propagator, PropagatorOpts} from './propagator';
import SpanContext from '../span_context';
import DefaultCodex from './default_codex';

export default class TextMapPropagator implements Propagator {
    _opts: PropagatorOpts;
    _codex: Codex;

    constructor(codex: Codex = new DefaultCodex(), opts: PropagatorOpts = new PropagatorOpts()) {
        this._opts = opts;
        this._codex = codex;
    }

    inject(spanContext: SpanContext, carrier: any): void {
        carrier[this._opts.traceIdKey()] = spanContext.traceId;
        carrier[this._opts.spanIdKey()] = spanContext.spanId;
        carrier[this._opts.parentSpanIdKey()] = spanContext.parentSpanId;

        const baggage = spanContext.baggage;
        for (const key in baggage) {
            if (baggage.hasOwnProperty(key)) {
                carrier[`${this._opts.baggageKeyPrefix()}${key}`] = this._codex.encode(spanContext.baggage[key]);
            }
        }
    }

    extract(carrier: any): SpanContext {
        const baggage = {};
        for (const key in carrier) {
            if (carrier.hasOwnProperty(key) && key.indexOf(this._opts.baggageKeyPrefix()) === 0) {
                const keySansPrefix = key.substring(this._opts.baggageKeyPrefix().length);
                baggage[keySansPrefix] = this._codex.decode(carrier[key]);
            }
        }
        return new SpanContext(carrier[this._opts.traceIdKey()], carrier[this._opts.spanIdKey()], carrier[this._opts.parentSpanIdKey()], baggage);
    }
}
