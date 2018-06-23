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
var span_context_1 = require("./span_context");
var span_1 = require("./span");
var tracer_1 = require("./tracer");
var noop_1 = require("./dispatchers/noop");
var in_memory_1 = require("./dispatchers/in_memory");
var file_1 = require("./dispatchers/file");
var remote_1 = require("./dispatchers/remote");
var configuration_1 = require("./configuration");
var opentracing = require("opentracing");
module.exports = {
    Configuration: configuration_1.default,
    initTracer: configuration_1.default.initTracer,
    SpanContext: span_context_1.default,
    Span: span_1.default,
    Tracer: tracer_1.default,
    NoopDispatcher: noop_1.default,
    InMemoryDispatcher: in_memory_1.default,
    FileDispatcher: file_1.default,
    AgentDispatcher: remote_1.default,
    opentracing: opentracing,
};
