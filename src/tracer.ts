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

import * as opentracing from 'opentracing';

import Configuration from './configuration';
import {Dispatcher} from './dispatchers/dispatcher';
import Span from './span';
import SpanContext from './span_context';
import NoopDispatcher from './dispatchers/noop';
import NullLogger from './logger';
import Utils from './utils';
import PropagationRegistry from './propagators/propagation_registry';
import TextMapPropagator from './propagators/textmap_propagator';
import URLCodex from './propagators/url_codex';

// startSpanFields is used for type-checking the Trace.startSpan().
declare interface StartSpanFields {
    childOf?: SpanContext;
    references?: opentracing.Reference[];
    tags?: any;
    startTime?: number;
    callerSpanContext?: SpanContext;
}

export default class Tracer {
    _serviceName: string;
    _dispatcher: Dispatcher;
    _commonTags: any;
    _logger: any;
    _registry: PropagationRegistry;

    constructor(serviceName: string,
                dispatcher = new NoopDispatcher(),
                commonTags: any = {},
                logger = new NullLogger()) {
        this._commonTags = commonTags || {};
        this._serviceName = serviceName;
        this._dispatcher = dispatcher;
        this._logger = logger;
        this._registry = new PropagationRegistry();
        this._registry.register(opentracing.FORMAT_TEXT_MAP, new TextMapPropagator());
        this._registry.register(opentracing.FORMAT_HTTP_HEADERS, new TextMapPropagator(new URLCodex()));
    }

    startSpan(operationName: string, fields?: StartSpanFields): Span {
        fields = fields || {};
        const references = fields.references || [];
        const spanTags = fields.tags || {};
        const startTime = fields.startTime || Utils.now();

        let followsFromIsParent = false;
        let parent = fields.childOf instanceof Span ? fields.childOf.context() : fields.childOf;

        // If there is no childOf in fields, then look into the references
        if (!parent) {
            for (let i = 0; i < references.length; i++) {
                const ref = references[i];
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

        const ctx = this._createSpanContext(parent, fields.callerSpanContext);
        return this._startSpan(operationName, ctx, startTime, references, spanTags);
    }

    private _startSpan(operationName: string,
                       ctx: SpanContext,
                       startTime: number,
                       references: opentracing.Reference[],
                       spanTags: any): Span {
        const span = new Span(this, operationName, ctx, startTime, references);
        span.addTags(this._commonTags)
            .addTags(spanTags);
        return span;
    }

    private _createSpanContext(parent: SpanContext, callerContext: SpanContext): SpanContext {
        if (!parent || !parent.isValid) {
            if (callerContext) {
                return new SpanContext(callerContext.traceId(), callerContext.spanId(), callerContext.parentSpanId(), callerContext.baggage());
            } else {
                const parentBaggage = parent && parent.baggage();
                return new SpanContext(Utils.randomUUID(), Utils.randomUUID(), parentBaggage);
            }
        } else {
            return new SpanContext(parent.traceId(), Utils.randomUUID(), parent.spanId(), parent.baggage());
        }
    }

    serviceName(): string {
        return this._serviceName;
    }

    dispatcher(): Dispatcher {
        return this._dispatcher;
    }

    close(callback: () => void): void {
        this._dispatcher.close(() => {
            if (this._logger) {
                this._logger.info('Tracer has been closed now.');
            }
            if (callback) {
                callback();
            }
        });
    }

    inject(spanContext: SpanContext, format: string, carrier: any): void {
        if (!spanContext) {
            return;
        }

        const propagator = this._registry._propagators(format);
        if (!propagator) {
            throw new Error('injector for the given format is not supported');
        }

        propagator.inject(spanContext, carrier);
    }

    extract(format: string, carrier: any): SpanContext {
        if (!carrier) {
            return;
        }

        const propagator = this._registry._propagators(format);
        if (!propagator) {
            throw new Error('extracttor for the given format is not supported');
        }

        return propagator.extract(carrier);
    }

    static initTracer(config): Tracer {
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
