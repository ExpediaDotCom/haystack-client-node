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
import LogData from './log_data';

export default class Span extends opentracing.Span {
    _tracerImpl: Tracer;
    _operationName: string;
    _spanContext: SpanContext;
    _startTime: number;
    _duration: number;
    _references: opentracing.Reference[];
    _logs: LogData[];
    _tags: { [key: string]: any };
    _isFinished: boolean;

    constructor(tracer: Tracer,
                operationName: string,
                spanContext: SpanContext,
                startTime: number,
                references: opentracing.Reference[]) {
        super();
        this._tracerImpl = tracer;
        this._operationName = operationName;
        this._spanContext = spanContext;
        this._startTime = startTime;
        this._references = references;
        this._logs = [];
        this._tags = {};
        this._isFinished = false;
    }

    operationName(): string {
        return this._operationName;
    }

    serviceName(): string {
        return this._tracerImpl._serviceName;
    }

    context(): SpanContext {
        return this._spanContext;
    }

    tags(): { [key: string]: any } {
        return this._tags;
    }

    logs(): LogData[] {
        return this._logs;
    }

    startTime(): number {
        return this._startTime;
    }

    duration(): number {
        return this._duration;
    }

    tracer(): opentracing.Tracer {
        return this._tracer();
    }

    setOperationName(name): this {
        this._setOperationName(name);
        return this;
    }

    isFinished(): boolean {
        return this._isFinished;
    }

    addTags(keyValueMap: { [key: string]: any; }): this {
        this._addTags(keyValueMap);
        return this;
    }

    setTag(k: string, v: any): this {
        this._tags[k] = v;
        return this;
    }

    setBaggageItem(key: string, value: string): this {
        const prevBaggageValue = this._spanContext.baggage[key];
        this._logFields(key, value, prevBaggageValue);
        this._spanContext = this._spanContext.addBaggageItem(key, value);
        return this;
    }

    log(keyValuePairs: { [p: string]: any }, timestamp?: number): this {
        this._log(keyValuePairs, timestamp);
        return this;
    }

    logEvent(eventName: string, data: any): void {
        this.log({
            event: eventName,
            payload: data
        });
    }

    finish(finishTime?: number, callback?: (error) => void): void {
        this._finish(finishTime, callback);
    }

    getBaggageItem(key: string): string | any {
        return this._getBaggageItem(key);
    }

    protected _tracer(): opentracing.Tracer {
        return this._tracerImpl;
    }

    protected _log(keyValuePairs: { [p: string]: any }, timestamp?: number): void {
        const kvPairs = {};
        for (const k in keyValuePairs) {
            if (keyValuePairs.hasOwnProperty(k)) {
                kvPairs[k] = keyValuePairs[k];
            }
        }
        this._logs.push(new LogData(kvPairs, timestamp || Utils.now()));
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

    protected _addTags(keyValuePairs: { [p: string]: any }): void {
        for (const k in keyValuePairs) {
            if (keyValuePairs.hasOwnProperty(k)) {
                this.setTag(k, keyValuePairs[k]);
            }
        }
    }

    protected _setOperationName(name: string): void {
        this._operationName = name;
    }

    protected _setBaggageItem(key: string, value: string): void {
        this._spanContext = this._spanContext.addBaggageItem(key, value);
    }

    protected _getBaggageItem(key: string): string | any {
        return this._spanContext.baggage()[key];
    }

    protected _context(): SpanContext {
        return this._spanContext;
    }

    protected _finish(finishTime?: number, callback?: (error) => void): void {
        if (this._isFinished) {
            const spanInfo = `operation=${this.operationName},context=${this.context().toString()}`;
            throw new Error(`cant finish the same span twice - ${spanInfo}`);
        }
        const endTime = finishTime || Utils.now();
        this._duration = endTime - this._startTime;
        this._tracerImpl.dispatcher().dispatch(this, callback);
        this._isFinished = true;
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
