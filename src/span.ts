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

import SpanContext from './span_context';
import Tracer from './tracer';
import Utils from './utils';

import * as opentracing from 'opentracing';

export default class Span {
    _tracer: Tracer;
    _operationName: string;
    _spanContext: SpanContext;
    _startTime: number;
    _duration: number;
    _references: opentracing.Reference[];
    _logs: opentracing.LogData[];
    _tags: opentracing.Tag[];
    _isFinished: boolean;

    constructor(tracer: Tracer,
                operationName: string,
                spanContext: SpanContext,
                startTime: number,
                references: opentracing.Reference[]) {
        this._tracer = tracer;
        this._operationName = operationName;
        this._spanContext = spanContext;
        this._startTime = startTime;
        this._references = references;
        this._logs = [];
        this._tags = [];
        this._isFinished = false;
    }

    operationName(): string {
        return this._operationName;
    }

    serviceName(): string {
        return this._tracer._serviceName;
    }

    context(): SpanContext {
        return this._spanContext;
    }

    tags(): opentracing.Tag[] {
        return this._tags;
    }

    logs(): opentracing.LogData[] {
        return this._logs;
    }

    startTime(): number {
        return this._startTime;
    }

    duration(): number {
        return this._duration;
    }

    tracer(): Tracer {
        return this._tracer;
    }

    setOperationName(name): Span {
        this._operationName = name;
        return this;
    }

    isFinished(): boolean {
        return this._isFinished;
    }
    addTags(keyValues: any): Span {
        for (const k in keyValues) {
            if (keyValues.hasOwnProperty(k)) {
                this.setTag(k, keyValues[k]);
            }
        }
        return this;
    }

    setTag(k: string, v: any): Span {
        this._tags.push({ key: k, value: v });
        return this;
    }

    setBaggageItem(key: string, value: string): Span {
        const prevBaggageValue = this._spanContext.baggage[key];
        this._logFields(key, value, prevBaggageValue);
        this._spanContext.addBaggageItem(key, value);
        return this;
    }

    log(keyValuePairs: any, timestamp?: number): void {
        const _tags = [];
        for (const k in keyValuePairs) {
            if (keyValuePairs.hasOwnProperty(k)) {
                _tags.push({key: k, value: keyValuePairs[k]});
            }
        }
        this._logs.push({
            timestamp: timestamp || Utils.now(),
            tags: _tags
        });
    }

    logEvent(eventName: string, payLoad: any): void {
        return this.log({
            event: eventName,
            payload: payLoad
        });
    }

    finish(finishTime?: number): void {
        if (this._isFinished) {
            const spanInfo = `operation=${this.operationName},context=${this.context().toString()}`;
            throw new Error(`cant finish the same span twice - ${spanInfo}`);
        }
        const endTime = finishTime || Utils.now();
        this._duration = endTime - this._startTime;
        this._tracer.dispatcher().dispatch(this);
        this._isFinished = true;
    }

    private _logFields(k: string, v: string, prevBaggageValue: string): void {
        const fields: { [key: string]: string } = {
            event: 'baggage',
            key: k,
            value: v
        };
        if (prevBaggageValue) {
            fields.override = 'true';
        }
        this.log(fields);
    }

    toString(): string {
        return JSON.stringify(
            Utils.merge(this._spanContext, {
                serviceName: this.serviceName(),
                operationName: this._operationName,
                tags: this._tags,
                logs: this._logs,
                startTime: this._startTime,
                duration: this._duration
            }));
    }
}
