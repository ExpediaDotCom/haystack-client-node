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

import { expect } from 'chai';
import Tracer from '../tracer';
import InMemoryDispatcher from '../dispatchers/in_memory';
import StartSpanFields from '../start_span_fields';
import {isUndefined} from 'util';

describe('Tracer tests', () => {
    const dummyServiceName = 'my-service';
    const dummyOperation = 'my-service-operation';
    const downstreamOperation = 'downstream';
    const commonTags = {
      version: '1.1'
    };

    describe('Tracer#startSpan', () => {
        it('should start a span and dispatch when finished', () => {
            const inMemSpanStore = new InMemoryDispatcher();
            const tracer = new Tracer(dummyServiceName, inMemSpanStore, commonTags);
            expect(tracer.serviceName()).equal(dummyServiceName);
            const span = tracer.startSpan(dummyOperation);
            expect(span.isFinished()).eq(false);
            expect(inMemSpanStore.spans().length).equal(0);
            span.finish();
            expect(inMemSpanStore.spans().length).equal(1);
            const receivedSpan = inMemSpanStore.spans()[0];
            expect(receivedSpan.isFinished()).eq(true);
            expect(receivedSpan.serviceName()).eq(dummyServiceName);
            expect(receivedSpan.operationName()).eq(dummyOperation);
            expect(isUndefined(receivedSpan.context().traceId())).eq(false);
            expect(isUndefined(receivedSpan.context().spanId())).eq(false);
            expect(isUndefined(receivedSpan.context().parentSpanId())).eq(true);
            const receivedSpanTag = receivedSpan.tags()[0];
            expect(receivedSpanTag.key).eq('version');
            expect(receivedSpanTag.value).eq('1.1');
        });

        it('should start and dispatch server and client spans', () => {
            const inMemSpanStore = new InMemoryDispatcher();
            const tracer = new Tracer(dummyServiceName, inMemSpanStore, commonTags);
            expect(tracer.serviceName()).equal(dummyServiceName);
            const serverSpan = tracer.startSpan(dummyOperation);
            const startSpanFields = new StartSpanFields();
            startSpanFields.childOf = serverSpan.context();
            startSpanFields.tags = { 'span.kind': 'client' };
            const clientSpan = tracer.startSpan(downstreamOperation, startSpanFields);

            expect(serverSpan.isFinished()).eq(false);
            expect(inMemSpanStore.spans().length).equal(0);
            serverSpan.finish();
            clientSpan.finish();

            expect(inMemSpanStore.spans().length).equal(2);
            inMemSpanStore.spans().forEach(receivedSpan => {
                expect(receivedSpan.isFinished()).eq(true);
                const receivedSpanTag = receivedSpan.tags()[0];
                expect(receivedSpanTag.key).eq('version');
                expect(receivedSpanTag.value).eq('1.1');
                expect(receivedSpan.serviceName()).eq(dummyServiceName);
            });
            expect(inMemSpanStore.spans().map(span => span.operationName())).includes(downstreamOperation);
            expect(inMemSpanStore.spans().map(span => span.operationName())).includes(dummyOperation);
            const receivedClientSpan = inMemSpanStore.spans().filter(span => span.tags().filter(tag => tag.key === 'span.kind' && tag.value === 'client').length > 0)[0];
            const receivedServerSpan = inMemSpanStore.spans().filter(span => span.tags().filter(tag => tag.key === 'span.kind').length <= 0)[0];
            expect(receivedClientSpan.context().parentSpanId()).eq(receivedServerSpan.context().spanId());
            expect(isUndefined(receivedServerSpan.context().parentSpanId())).eq(true);
            expect(receivedServerSpan.context().traceId()).eq(receivedClientSpan.context().traceId());
        });
    });
});
