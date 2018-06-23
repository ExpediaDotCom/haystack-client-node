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


import SpanContext from "./span_context";
import Span from "./span";
import Tracer from "./tracer";

import NoopDispatcher from "./dispatchers/noop";
import InMemoryDispatcher from "./dispatchers/in_memory";
import FileDispatcher from "./dispatchers/file";
import AgentDispatcher from "./dispatchers/remote";
import Configuration from "./configuration";

import * as opentracing from "opentracing";

module.exports = {
    Configuration,
    initTracer: Tracer.initTracer,
    SpanContext,
    Span,
    Tracer,

    NoopDispatcher,
    InMemoryDispatcher,
    FileDispatcher,
    AgentDispatcher,

    opentracing,
};
