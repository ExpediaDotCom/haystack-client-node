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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
var Span = (function () {
    function Span(tracer, operationName, spanContext, startTime, references) {
        this._tracer = tracer;
        this._operationName = operationName;
        this._spanContext = spanContext;
        this._startTime = startTime;
        this._references = references;
        this._logs = [];
        this._tags = [];
    }
    Span.prototype.operationName = function () {
        return this._operationName;
    };
    Span.prototype.serviceName = function () {
        return this._tracer._serviceName;
    };
    Span.prototype.context = function () {
        return this._spanContext;
    };
    Span.prototype.logs = function () {
        return this._logs;
    };
    Span.prototype.tracer = function () {
        return this._tracer;
    };
    Span.prototype.setOperationName = function (name) {
        this._operationName = name;
        return this;
    };
    Span.prototype.addTags = function (keyValues) {
        for (var k in keyValues) {
            if (keyValues.hasOwnProperty(k)) {
                this.setTag(k, keyValues[k]);
            }
        }
        return this;
    };
    Span.prototype.setTag = function (key, value) {
        this._tags.push({ key: key, value: value });
        return this;
    };
    Span.prototype.setBaggageItem = function (key, value) {
        var prevBaggageValue = this._spanContext.baggage[key];
        this._logFields(key, value, prevBaggageValue);
        this._spanContext.withBaggageItem(key, value);
        return this;
    };
    Span.prototype.log = function (keyValuePairs, timestamp) {
        var tags = [];
        for (var key in keyValuePairs) {
            var value = keyValuePairs[key];
            if (keyValuePairs.hasOwnProperty(key)) {
                tags.push({ key: key, value: value });
            }
        }
        this._logs.push({
            timestamp: timestamp || utils_1.default.now(),
            tags: tags
        });
    };
    Span.prototype.logEvent = function (eventName, payload) {
        return this.log({
            event: eventName,
            payload: payload,
        });
    };
    Span.prototype.finish = function (finishTime) {
        if (this._duration) {
            var spanInfo = "operation=" + this.operationName + ",context=" + this.context().toString();
            throw new Error("cant finish the same span twice - " + spanInfo);
        }
        var endTime = finishTime || utils_1.default.now();
        this._duration = endTime - this._startTime;
        this._tracer.dispatcher().dispatch(this);
    };
    Span.prototype._logFields = function (key, value, prevBaggageValue) {
        var fields = {
            event: 'baggage',
            key: key,
            value: value,
        };
        if (prevBaggageValue) {
            fields.override = 'true';
        }
        this.log(fields);
    };
    return Span;
}());
exports.default = Span;
