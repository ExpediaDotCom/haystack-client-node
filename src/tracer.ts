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
import NullLogger from "./logger";
import Span from "./span";
import SpanContext from "./span_context";
import Utils from "./utils";
import NoopDispatcher from "./dispatchers/noop";
import {Dispatcher} from "./dispatchers/dispatcher";
import Configuration from "./configuration";

// startSpanFields is used for type-checking the Trace.startSpan().
declare type StartSpanFields = {
    childOf?: SpanContext,
    references?: Array <opentracing.Reference>,
    tags?: any,
    startTime?: number,
};

export default class Tracer {
    _serviceName: string;
    _dispatcher: Dispatcher;
    _commonTags: any;
    _logger: any;

    constructor(serviceName: string,
                dispatcher = new NoopDispatcher(),
                commonTags: any = {},
                logger = new NullLogger()) {
        this._commonTags = commonTags || {};
        this._serviceName = serviceName;
        this._dispatcher = dispatcher;
        this._logger = logger;
    }

    startSpan(operationName: string, fields?: StartSpanFields): Span {
        fields = fields || {};
        let references = fields.references || [];
        let spanTags = fields.tags || {};
        let startTime = fields.startTime || Utils.now();

        let followsFromIsParent = false;
        let parent = fields.childOf instanceof Span ? fields.childOf.context() : fields.childOf;

        // If there is no childOf in fields, then look into the references
        if (!parent) {
            for (let i = 0; i < references.length; i++) {
                let ref = references[i];
                if (ref.type() === opentracing.REFERENCE_CHILD_OF) {
                    if (!parent || followsFromIsParent) {
                        parent = ref.referencedContext();
                        break;
                    }
                } else if (ref.type() === opentracing.REFERENCE_FOLLOWS_FROM) {
                    if (!parent) {
                        parent = ref.referencedContext();
                        followsFromIsParent = true;
                    }
                }
            }
        }

        const ctx = this._createSpanContext(parent);
        return this._startSpan(operationName, ctx, startTime, references, spanTags);
    }

    private _startSpan(operationName: string,
                       ctx: SpanContext,
                       startTime: number,
                       references: Array<opentracing.Reference>,
                       spanTags: any) {
        const span = new Span(this, operationName, ctx, startTime, references);
        span.addTags(this._commonTags)
            .addTags(spanTags);
        return span;
    }

    private _createSpanContext(parent: SpanContext): SpanContext {
        if (!parent || !parent.isValid) {
            let randomId = Utils.randomUUID();
            let parentBaggage = parent && parent.baggage();
            return new SpanContext(randomId, randomId, parentBaggage);
        } else {
            return new SpanContext(parent.traceId(), Utils.randomUUID(), parent.spanId(), parent.baggage());
        }
    }

    serviceName() {
        return this._serviceName;
    }

    dispatcher() {
        return this._dispatcher;
    }

    close() {
        this._dispatcher.close(() => {
            this._logger.log('Tracer has been closed now.');
        });
    }

    static initTracer(config) {
        if (config.disable) {
            return new opentracing.Tracer();
        }

        if (!config.serviceName) {
            throw new Error(`config.serviceName must be provided`);
        }

        const dispatcher = Configuration._getDispatcher(config);

        if (config.logger) {
            config.logger.info(`Initializing Haystack Tracer with ${dispatcher.name()}`);
        }

        return new Tracer(config.serviceName, dispatcher, config.commonTags, config.logger);
    }
}
