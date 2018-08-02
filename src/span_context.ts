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
    traceId: string;
    spanId: string;
    parentSpanId: string;
    baggage: any;

    constructor(
        traceId,
        spanId,
        parentSpanId,
        baggage = {}) {
        super();
        this.traceId = traceId;
        this.spanId = spanId;
        this.parentSpanId = parentSpanId;
        this.baggage = baggage;
    }

    setTraceId(traceId: string): void {
        this.traceId = traceId;
    }

    setSpanId(spanId: string): void {
        this.spanId = spanId;
    }

    setParentSpanId(parentSpanId: string): void {
        this.parentSpanId = parentSpanId;
    }

    addBaggageItem(key: string, value: any): SpanContext {
        const newBaggage = Utils.assign(this.baggage, key, value);
        return new SpanContext(
            this.traceId,
            this.spanId,
            this.parentSpanId,
            newBaggage);
    }

    isValid(): boolean {
        return !!(this.traceId && this.spanId);
    }
}
