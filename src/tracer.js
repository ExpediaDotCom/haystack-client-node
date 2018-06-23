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
var opentracing = require("opentracing");
var logger_1 = require("./logger");
var span_1 = require("./span");
var span_context_1 = require("./span_context");
var utils_1 = require("./utils");
var noop_1 = require("./dispatchers/noop");
var Tracer = (function () {
    function Tracer(serviceName, dispatcher, commonTags, logger) {
        if (dispatcher === void 0) { dispatcher = new noop_1.default(); }
        if (commonTags === void 0) { commonTags = {}; }
        if (logger === void 0) { logger = new logger_1.default(); }
        this._commonTags = commonTags || {};
        this._serviceName = serviceName;
        this._dispatcher = dispatcher;
        this._logger = logger;
    }
    Tracer.prototype.startSpan = function (operationName, fields) {
        var references = fields.references || [];
        var spanTags = fields.tags || {};
        var startTime = fields.startTime || utils_1.default.now();
        var followsFromIsParent = false;
        var parent = fields.childOf instanceof span_1.default ? fields.childOf.context() : fields.childOf;
        // If there is no childOf in fields, then look into the references
        for (var i = 0; i < references.length; i++) {
            var ref = references[i];
            if (ref.type() === opentracing.REFERENCE_CHILD_OF) {
                if (!parent || followsFromIsParent) {
                    parent = ref.referencedContext();
                    break;
                }
            }
            else if (ref.type() === opentracing.REFERENCE_FOLLOWS_FROM) {
                if (!parent) {
                    parent = ref.referencedContext();
                    followsFromIsParent = true;
                }
            }
        }
        var ctx = this._createSpanContext(parent);
        return this._startSpan(operationName, ctx, startTime, references, spanTags);
    };
    Tracer.prototype._startSpan = function (operationName, ctx, startTime, references, spanTags) {
        var span = new span_1.default(this, operationName, ctx, startTime, references);
        span.addTags(this._commonTags);
        span.addTags(spanTags);
        return span;
    };
    Tracer.prototype._createSpanContext = function (parent) {
        if (!parent || !parent.isValid) {
            var randomId = utils_1.default.randomUUID();
            var parentBaggage = parent && parent.baggage();
            return new span_context_1.default(randomId, randomId, parentBaggage);
        }
        else {
            return new span_context_1.default(parent.traceId, utils_1.default.randomUUID(), parent.spanId, parent.baggage);
        }
    };
    Tracer.prototype.serviceName = function () {
        return this._serviceName;
    };
    Tracer.prototype.dispatcher = function () {
        return this._dispatcher;
    };
    Tracer.prototype.close = function () {
        var _this = this;
        this._dispatcher.close(function () {
            _this._logger.log('Tracer has been closed now.');
        });
    };
    return Tracer;
}());
exports.default = Tracer;
