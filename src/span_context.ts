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

import Utils from './utils';
import * as opentracing from 'opentracing';

export default class SpanContext extends opentracing.SpanContext {
    _traceId: string;
    _spanId: string;
    _parentSpanId: string;
    _baggage: any;

    constructor(
        traceId,
        spanId,
        parentSpanId,
        baggage = {}) {
        super();
        this._traceId = traceId;
        this._spanId = spanId;
        this._parentSpanId = parentSpanId;
        this._baggage = baggage;
    }

    traceId(): string {
        return this._traceId;
    }

    spanId(): string {
        return this._spanId;
    }

    parentSpanId(): string {
        return this._parentSpanId;
    }

    baggage(): any {
        return this._baggage;
    }

    setTraceId(traceId: string): void {
        this._traceId = traceId;
    }

    setSpanId(spanId: string): void {
        this._spanId = spanId;
    }

    setParentSpanId(parentSpanId: string): void {
        this._parentSpanId = parentSpanId;
    }

    addBaggageItem(key: string, value: any): SpanContext {
        const newBaggage = Utils.assign(this._baggage, key, value);
        return new SpanContext(
            this._traceId,
            this._spanId,
            this._parentSpanId,
            newBaggage);
    }

    isValid(): boolean {
        return !!(this._traceId && this._spanId);
    }
}
