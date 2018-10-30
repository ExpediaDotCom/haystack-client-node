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
import { Logger, NullLogger } from './logger';
import Utils from './utils';
import PropagationRegistry from './propagators/propagation_registry';
import TextMapPropagator from './propagators/textmap_propagator';
import URLCodex from './propagators/url_codex';
import StartSpanFields from './start_span_fields';
import BinaryPropagator from './propagators/binary_propagator';
import { TracerConfig } from './tracer-config';
import { Generator, UUIDGenerator } from './generators';

export default class Tracer extends opentracing.Tracer {
    _serviceName: string;
    _dispatcher: Dispatcher;
    _idGenerator: Generator;
    _commonTags: { [key: string]: any };
    _logger: any;
    _registry: PropagationRegistry;
    _useDualSpanMode: boolean;

    constructor(serviceName: string,
                dispatcher: Dispatcher = new NoopDispatcher(),
                commonTags: { [key: string]: any } = {},
                logger: Logger = new NullLogger(),
                idGenerator: Generator = new UUIDGenerator(),
                useDualSpanMode: boolean = false) {
        super();
        this._commonTags = commonTags || {};
        this._serviceName = serviceName;
        this._dispatcher = dispatcher;
        this._logger = logger;
        this._registry = new PropagationRegistry();
        this._registry.register(opentracing.FORMAT_TEXT_MAP, new TextMapPropagator());
        this._registry.register(opentracing.FORMAT_BINARY, new BinaryPropagator());
        this._registry.register(opentracing.FORMAT_HTTP_HEADERS, new TextMapPropagator(new URLCodex()));
        this._idGenerator = idGenerator;
        this._useDualSpanMode = useDualSpanMode;
    }

    startSpan(operationName: string, fields?: StartSpanFields): Span {
       return this._startSpan(operationName, fields);
    }

    protected _startSpan(operationName: string, fields: StartSpanFields): Span {
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
                        parent = ref.referencedContext() as SpanContext;
                        break;
                    }
                } else if (ref.type() === opentracing.REFERENCE_FOLLOWS_FROM) {
                    if (!parent) {
                        parent = ref.referencedContext() as SpanContext;
                        followsFromIsParent = true;
                    }
                }
            }
        }

        const ctx = this._createSpanContext(parent, spanTags);
        return this._spanStart(operationName, ctx, startTime, references, spanTags);
    }

    private _spanStart(operationName: string,
                       ctx: SpanContext,
                       startTime: number,
                       references: opentracing.Reference[],
                       spanTags: { [key: string]: any }): Span {
        const span = new Span(this, operationName, ctx, startTime, references);
        span.addTags(this._commonTags)
            .addTags(spanTags);
        return span;
    }

    private isServerSpan(spanTags: { [key: string]: any }): boolean {
        const spanKind = spanTags[opentracing.Tags.SPAN_KIND];
        return spanKind && (spanKind === 'server');
    }

    // This is a check to see if the tracer is configured to support single
    // single span type (Zipkin style shared span id) or
    // dual span type (client and server having their own span ids ).
    // a. If tracer is not of dualSpanType and if it is a server span then we
    // just return the parent context with the same shared span ids
    // b. If tracer is not of dualSpanType and if the parent context is an extracted one from the wire
    // then we assume this is the first span in the server and so just return the parent context
    // with the same shared span ids
    private _createSpanContext(parent: SpanContext, spanTags: { [key: string]: any }): SpanContext {
        if (!parent || !parent.isValid) {
            const parentBaggage = parent && parent.baggage;
            return new SpanContext(this._idGenerator.generate(), this._idGenerator.generate(), parentBaggage);
        } else {
            if (!this._useDualSpanMode && (this.isServerSpan(spanTags) || parent.isExtractedContext())) {
                return new SpanContext(parent.traceId, parent.spanId, parent.parentSpanId, parent.baggage);
            } else {
                return new SpanContext(parent.traceId, this._idGenerator.generate(), parent.spanId, parent.baggage);
            }
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
        return this._inject(spanContext, format, carrier);
    }

    extract(format: string, carrier: any): SpanContext {
       return this._extract(format, carrier);
    }

    protected _inject(spanContext: SpanContext, format: string, carrier: any): void {
        if (!spanContext) {
            return;
        }

        const propagator = this._registry.propagator(format);
        if (!propagator) {
            throw new Error('injector is not supported for format=' + format);
        }

        propagator.inject(spanContext, carrier);
    }

    protected _extract(format: string, carrier: any): SpanContext | any {
        if (!carrier) {
            return null;
        }

        const propagator = this._registry.propagator(format);
        if (!propagator) {
            throw new Error('extractor is not supported for format=' + format);
        }

        const ctx = propagator.extract(carrier);
        if (ctx) {
            ctx.setExtractedContext();
        }
        return ctx;
    }

    static initTracer(config: TracerConfig): opentracing.Tracer {
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
        return new Tracer(config.serviceName, dispatcher, config.commonTags, config.logger, config.idGenerator);
    }
}
