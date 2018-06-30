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

import { expect } from 'chai';
import Tracer from '../src/tracer';
import InMemoryDispatcher from '../src/dispatchers/in_memory';
import StartSpanFields from '../src/start_span_fields';
import {isUndefined} from 'util';
import SpanContext from '../src/span_context';

const dummyServiceName = 'my-service';
const dummyOperation = 'my-service-operation';
const downstreamOperation = 'downstream';
const commonTags = {
    version: '1.1'
};

const expectSpansInStore = (inMemSpanStore: InMemoryDispatcher, expectedCount: number): void => {
    expect(inMemSpanStore.spans().length).eq(expectedCount);
    inMemSpanStore.spans().forEach(receivedSpan => {
        expect(receivedSpan.isFinished()).eq(true);
        const receivedSpanTag = receivedSpan.tags()[0];
        expect(receivedSpanTag.key).eq('version');
        expect(receivedSpanTag.value).eq('1.1');
        expect(receivedSpan.serviceName()).eq(dummyServiceName);
        expect(isUndefined(receivedSpan.context().traceId())).eq(false);
        expect(isUndefined(receivedSpan.context().spanId())).eq(false);
    });
};

describe('Tracer tests', () => {

    describe('Tracer#startSpan', () => {
        it('should start a span and dispatch when finished', () => {
            const inMemSpanStore = new InMemoryDispatcher();
            const tracer = new Tracer(dummyServiceName, inMemSpanStore, commonTags);
            expect(tracer.serviceName()).equal(dummyServiceName);
            const span = tracer.startSpan(dummyOperation);
            expect(span.isFinished()).eq(false);
            expect(inMemSpanStore.spans().length).equal(0);
            span.finish();
            expectSpansInStore(inMemSpanStore, 1);
            const receivedSpan = inMemSpanStore.spans()[0];
            expect(receivedSpan.operationName()).eq(dummyOperation);
            expect(isUndefined(receivedSpan.context().parentSpanId())).eq(true);
        });

        it('should start and dispatch server and client spans', () => {
            const inMemSpanStore = new InMemoryDispatcher();
            const tracer = new Tracer(dummyServiceName, inMemSpanStore, commonTags);

            const startServerSpanFields = new StartSpanFields();
            startServerSpanFields.tags = { 'span.kind': 'server'};
            const serverSpan = tracer.startSpan(dummyOperation, startServerSpanFields);

            const startClientSpanFields = new StartSpanFields();
            startClientSpanFields.childOf = serverSpan.context();
            startClientSpanFields.tags = { 'span.kind': 'client' };
            const clientSpan = tracer.startSpan(downstreamOperation, startClientSpanFields);

            expect(serverSpan.isFinished()).eq(false);
            expect(inMemSpanStore.spans().length).equal(0);
            serverSpan.finish();
            clientSpan.finish();

            expectSpansInStore(inMemSpanStore, 2);

            expect(inMemSpanStore.spans().map(span => span.operationName())).includes(downstreamOperation);
            expect(inMemSpanStore.spans().map(span => span.operationName())).includes(dummyOperation);

            const receivedClientSpan = inMemSpanStore.spans().filter(span => {
                return span.tags().filter(tag => tag.key === 'span.kind' && tag.value === 'client').length > 0
            })[0];
            const receivedServerSpan = inMemSpanStore.spans().filter(span => {
                return span.tags().filter(tag => tag.key === 'span.kind' && tag.value === 'server').length > 0
            })[0];

            expect(receivedClientSpan.context().parentSpanId()).eq(receivedServerSpan.context().spanId());
            expect(isUndefined(receivedServerSpan.context().parentSpanId())).eq(true);
            expect(receivedServerSpan.context().traceId()).eq(receivedClientSpan.context().traceId());
        });

        it('should inject the span in the carrier', () => {
            const inMemSpanStore = new InMemoryDispatcher();
            const tracer = new Tracer(dummyServiceName, inMemSpanStore, commonTags);
            const spanContext = new SpanContext('a', 'b', 'c');
            const carrier = {};
            tracer.inject(spanContext, opentracing.FORMAT_TEXT_MAP, carrier);
            expect(JSON.stringify(carrier)).eq('{"Trace-ID":"a","Span-ID":"b","Parent-ID":"c"}');
        });

        it('should extract the span from the carrier', () => {
            const inMemSpanStore = new InMemoryDispatcher();
            const tracer = new Tracer(dummyServiceName, inMemSpanStore, commonTags);
            const carrier = {'Trace-ID': 'a', 'Span-ID': 'b', 'Parent-ID': 'c'};
            const spanContext = tracer.extract(opentracing.FORMAT_TEXT_MAP, carrier);
            expect(JSON.stringify(spanContext)).eq('{"_traceId":"a","_spanId":"b","_parentSpanId":"c","_baggage":{}}');
        });
    });
});
