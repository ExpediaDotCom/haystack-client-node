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
import Tracer from '../../src/tracer';
import InMemoryDispatcher from '../../src/dispatchers/in_memory';
import StartSpanFields from '../../src/start_span_fields';
import {isUndefined} from 'util';
import SpanContext from '../../src/span_context';
import Span from '../../src/span';
import { NullLogger } from '../../src/logger';
import { UUIDGenerator } from '../../src/generators';

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
        const versionTagValue = receivedSpan.tags()['version'];
        expect(versionTagValue).eq('1.1');
        expect(receivedSpan.serviceName()).eq(dummyServiceName);
        expect(isUndefined(receivedSpan.context().traceId)).eq(false);
        expect(isUndefined(receivedSpan.context().spanId)).eq(false);
    });
};

const findSpan = (inMemSpanStore: InMemoryDispatcher, spanKind: string): Span => {
    return inMemSpanStore
        .spans()
        .filter(span => span.tags()['span.kind'] === spanKind)[0];
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
            expect(receivedSpan.context().parentSpanId).eq('');
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
            clientSpan.log({
                eventCode: 100
            });

            expect(serverSpan.isFinished()).eq(false);
            expect(inMemSpanStore.spans().length).equal(0);
            clientSpan.finish();
            serverSpan.finish();

            expectSpansInStore(inMemSpanStore, 2);

            const receivedClientSpan = findSpan(inMemSpanStore, 'client');
            const receivedServerSpan = findSpan(inMemSpanStore, 'server');

            expect(receivedClientSpan.operationName()).eq(downstreamOperation);
            expect(receivedServerSpan.operationName()).eq(dummyOperation);
            expect(receivedClientSpan.duration() <= receivedServerSpan.duration()).eq(true);
            expect(receivedClientSpan.context().parentSpanId).eq(receivedServerSpan.context().spanId);
            expect(receivedServerSpan.context().parentSpanId).eq('');
            expect(receivedServerSpan.context().traceId).eq(receivedClientSpan.context().traceId);

            expect(receivedClientSpan.logs().length).eq(1);
            receivedClientSpan.logs().forEach(log => {
              expect(log.keyValuePairs['eventCode']).eq(100);
              expect(log.timestamp <= (Date.now() * 1000)).eq(true);
            })
        });

        it('should create server span as a sharable span if tracer is in sharable mode(default) and span.kind is set', () => {
            const inMemSpanStore = new InMemoryDispatcher();
            const tracer = new Tracer(dummyServiceName, inMemSpanStore, commonTags);

            const startServerSpanFields = new StartSpanFields();
            startServerSpanFields.childOf = new SpanContext('T1', 'S1', 'P1');
            startServerSpanFields.tags = { 'span.kind': 'server'};
            const serverSpan = tracer.startSpan(dummyOperation, startServerSpanFields);
            expect(serverSpan.isFinished()).eq(false);
            expect(inMemSpanStore.spans().length).equal(0);
            
            serverSpan.finish();
            expect(inMemSpanStore.spans().length).equal(1);
            const receivedServerSpan = findSpan(inMemSpanStore, 'server');
            expect(receivedServerSpan.context().traceId).eq('T1');
            expect(receivedServerSpan.context().spanId === 'S1').eq(true);
            expect(receivedServerSpan.context().parentSpanId).eq('P1');
        });

        it('should create server span as a sharable span if tracer is in sharable mode(default) and context is extracted', () => {
            const inMemSpanStore = new InMemoryDispatcher();
            const tracer = new Tracer(dummyServiceName, inMemSpanStore, commonTags);

            const startServerSpanFields = new StartSpanFields();
            const carrier = {'Trace-ID': 'T1' , 'Span-ID': 'S1', 'Parent-ID': 'P1', 'Baggage-myKey': 'myVal'};
            const clientSpanContext = tracer.extract(opentracing.FORMAT_TEXT_MAP, carrier);
            startServerSpanFields.childOf = clientSpanContext;
            const serverSpan = tracer.startSpan(dummyOperation, startServerSpanFields);
            expect(serverSpan.isFinished()).eq(false);
            expect(inMemSpanStore.spans().length).equal(0);
            
            serverSpan.finish();
            expect(inMemSpanStore.spans().length).equal(1);
            const receviedSpan = inMemSpanStore.spans()[0];
            expect(receviedSpan.context().traceId).eq('T1');
            expect(receviedSpan.context().spanId === 'S1').eq(true);
            expect(receviedSpan.context().parentSpanId).eq('P1');
        });

        it('should create server span as a non-sharable span if tracer is in dualspan mode and context is extracted', () => {
            const inMemSpanStore = new InMemoryDispatcher();
            const tracer = new Tracer(dummyServiceName, inMemSpanStore, commonTags, new NullLogger(), new UUIDGenerator(), true);

            const startServerSpanFields = new StartSpanFields();
            const carrier = {'Trace-ID': 'T1' , 'Span-ID': 'S1', 'Parent-ID': 'P1', 'Baggage-myKey': 'myVal'};
            const clientSpanContext = tracer.extract(opentracing.FORMAT_TEXT_MAP, carrier);
            startServerSpanFields.childOf = clientSpanContext;
            const serverSpan = tracer.startSpan(dummyOperation, startServerSpanFields);
            expect(serverSpan.isFinished()).eq(false);
            expect(inMemSpanStore.spans().length).equal(0);
            
            serverSpan.finish();
            expect(inMemSpanStore.spans().length).equal(1);
            const receviedSpan = inMemSpanStore.spans()[0];
            expect(receviedSpan.context().traceId).eq('T1');
            expect(receviedSpan.context().spanId === 'S1').eq(false);
            expect(receviedSpan.context().spanId === 'P1').eq(false);
            expect(receviedSpan.context().spanId === 'T1').eq(false);
            expect(receviedSpan.context().parentSpanId).eq('S1');
        });

        it('should create server span as a non-sharable span if tracer is in dualspan mode even though span.kind is set as server', () => {
            const inMemSpanStore = new InMemoryDispatcher();
            const tracer = new Tracer(dummyServiceName, inMemSpanStore, commonTags, new NullLogger(), new UUIDGenerator(), true);

            const startServerSpanFields = new StartSpanFields();
            startServerSpanFields.childOf = new SpanContext('T1', 'S1', 'P1');
            startServerSpanFields.tags = { 'span.kind': 'server'};
            const serverSpan = tracer.startSpan(dummyOperation, startServerSpanFields);
            expect(serverSpan.isFinished()).eq(false);
            expect(inMemSpanStore.spans().length).equal(0);
            
            serverSpan.finish();
            expect(inMemSpanStore.spans().length).equal(1);
            const receviedSpan = inMemSpanStore.spans()[0];
            expect(receviedSpan.context().traceId).eq('T1');
            expect(receviedSpan.context().spanId === 'S1').eq(false);
            expect(receviedSpan.context().spanId === 'P1').eq(false);
            expect(receviedSpan.context().spanId === 'T1').eq(false);
            expect(receviedSpan.context().parentSpanId).eq('S1');
        });

        it('SpanContext if not extracted should return isExtracted() method as false', () => {
            const ctx = new SpanContext('T1', 'S1', 'P1', {});
            expect(ctx.traceId).eq('T1');
            expect(ctx.isExtractedContext()).eq(false);
            expect(ctx.spanId).eq('S1');
            expect(ctx.parentSpanId).eq('P1');
        });

        it('should inject the span in the carrier', () => {
            const inMemSpanStore = new InMemoryDispatcher();
            const tracer = new Tracer(dummyServiceName, inMemSpanStore, commonTags);
            const spanContext = new SpanContext('a', 'b', 'c', { myKey: 'myVal'});
            const carrier = {};
            tracer.inject(spanContext, opentracing.FORMAT_TEXT_MAP, carrier);
            expect(JSON.stringify(carrier)).eq('{"Trace-ID":"a","Span-ID":"b","Parent-ID":"c","Baggage-myKey":"myVal"}');
        });

        it('should extract the span from the carrier', () => {
            const inMemSpanStore = new InMemoryDispatcher();
            const tracer = new Tracer(dummyServiceName, inMemSpanStore, commonTags);
            const carrier = {'Trace-ID': 'a' , 'Span-ID': 'b', 'Parent-ID': 'c', 'Baggage-myKey': 'myVal'};
            const spanContext = tracer.extract(opentracing.FORMAT_TEXT_MAP, carrier);
            expect(spanContext.isExtractedContext()).eq(true);
            expect(JSON.stringify(spanContext)).eq('{"traceId":"a","spanId":"b","parentSpanId":"c","baggage":{"myKey":"myVal"},"extractedContext":true}');
        });
    });
});
