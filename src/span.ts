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

import * as opentracing from "opentracing";
import SpanContext from "./span_context";
import Utils from "./utils";
import Tracer from "./tracer";

export default class Span {
    _tracer: Tracer;
    _operationName: string;
    _spanContext: SpanContext;
    _startTime: number;
    _duration: number;
    _references: Array<opentracing.Reference>;
    _logs: Array<opentracing.LogData>;
    _tags: Array<opentracing.Tag>;
    _isFinished: boolean;

    constructor(tracer: Tracer,
                operationName: string,
                spanContext: SpanContext,
                startTime: number,
                references: Array<opentracing.Reference>) {
        this._tracer = tracer;
        this._operationName = operationName;
        this._spanContext = spanContext;
        this._startTime = startTime;
        this._references = references;
        this._logs = [];
        this._tags = [];
        this._isFinished = false;
    }

    operationName() {
        return this._operationName;
    }

    serviceName() {
        return this._tracer._serviceName;
    }

    context() {
        return this._spanContext;
    }

    tags() {
        return this._tags;
    }

    logs() {
        return this._logs;
    }

    startTime() {
        return this._startTime;
    }

    duration() {
        return this._duration;
    }

    tracer() {
        return this._tracer;
    }

    setOperationName(name) {
        this._operationName = name;
        return this;
    }

    addTags(keyValues: any): Span {
        for (let k in keyValues) {
            if(keyValues.hasOwnProperty(k)) {
                this.setTag(k, keyValues[k]);
            }
        }
        return this;
    }

    setTag(key: string, value: any): Span {
        this._tags.push({ key: key, value: value });
        return this;
    }

    setBaggageItem(key: string, value: string): Span {
        let prevBaggageValue = this._spanContext.baggage[key];
        this._logFields(key, value, prevBaggageValue);
        this._spanContext.addBaggageItem(key, value);
        return this;
    }

    log(keyValuePairs: any, timestamp?: number): void {
        let tags = [];
        for (let key in keyValuePairs) {
            if (keyValuePairs.hasOwnProperty(key)) {
                tags.push({key: key, value: keyValuePairs[key]});
            }
        }
        this._logs.push({
            timestamp: timestamp || Utils.now(),
            tags: tags
        });
    }

    logEvent(eventName: string, payload: any): void {
        return this.log({
            event: eventName,
            payload: payload,
        });
    }

    finish(finishTime?: number): void {
        if (this._isFinished) {
            let spanInfo = `operation=${this.operationName},context=${this.context().toString()}`;
            throw new Error(`cant finish the same span twice - ${spanInfo}`);
        }
        let endTime = finishTime || Utils.now();
        this._duration = endTime - this._startTime;
        this._tracer.dispatcher().dispatch(this);
        this._isFinished = true;
    }

    private _logFields(key: string, value: string, prevBaggageValue: string) {
        let fields: { [key: string]: string } = {
            event: 'baggage',
            key: key,
            value: value,
        };
        if (prevBaggageValue) {
            fields.override = 'true';
        }
        this.log(fields);
    }

    toString() {
        return JSON.stringify(
            Utils.merge(this._spanContext, {
                'serviceName': this.serviceName(),
                'operationName': this._operationName,
                'tags': this._tags,
                'logs': this._logs,
                'startTime': this._startTime,
                'duration': this._duration,
            }));
    }
}