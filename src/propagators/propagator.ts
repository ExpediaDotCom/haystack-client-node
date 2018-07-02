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

import SpanContext from '../span_context';

export class PropagatorOpts {
    _traceIdKey: string;
    _spanIdKey: string;
    _parentSpanIdKey: string;
    _baggageKeyPrefix: string;

    traceIdKey(): string {
        return this._traceIdKey || 'Trace-ID';
    }

    spanIdKey(): string {
        return this._spanIdKey || 'Span-ID';
    }

    parentSpanIdKey(): string {
        return this._parentSpanIdKey || 'Parent-ID';
    }

    baggageKeyPrefix(): string {
        return this._baggageKeyPrefix || 'Baggage-';
    }
}

export interface Propagator {
    inject(spanContext: SpanContext, carrier: any): void;
    extract(carrier: any): SpanContext;
}

export interface Codex {
    encode(value: string): string;
    decode(value: string): string;
}
