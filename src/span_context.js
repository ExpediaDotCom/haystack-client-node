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
var SpanContext = (function () {
    function SpanContext(traceId, spanId, parentSpanId, baggage) {
        if (baggage === void 0) { baggage = {}; }
        this._traceId = traceId;
        this._spanId = spanId;
        this._parentSpanId = parentSpanId;
        this._baggage = baggage;
    }
    SpanContext.prototype.traceId = function () {
        return this._traceId;
    };
    SpanContext.prototype.spanId = function () {
        return this._spanId;
    };
    SpanContext.prototype.parentSpanId = function () {
        return this._parentSpanId;
    };
    SpanContext.prototype.baggage = function () {
        return this._baggage;
    };
    SpanContext.prototype.withBaggageItem = function (key, value) {
        var newBaggage = utils_1.default.extend(this._baggage, key, value);
        return new SpanContext(this._traceId, this._spanId, this._parentSpanId, newBaggage);
    };
    SpanContext.prototype.isValid = function () {
        return !!(this._traceId && this._spanId);
    };
    return SpanContext;
}());
exports.default = SpanContext;
