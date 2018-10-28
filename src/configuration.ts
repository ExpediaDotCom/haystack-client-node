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

import FileDispatcher from './dispatchers/file';
import RemoteGrpcAgentDispatcher from './dispatchers/grpc_agent';
import { Dispatcher } from './dispatchers/dispatcher';
import InMemoryDispatcher from './dispatchers/in_memory';
import NoopDispatcher from './dispatchers/noop';
import HttpCollectorDispatcher from './dispatchers/http_collector';
import { DispatcherConfig } from './dispatchers/dispatcher-config';
import { TracerConfig } from './tracer-config';

export default class Configuration {
    static _getDispatcher(config: TracerConfig): Dispatcher {

        const dispatcher: DispatcherConfig = config.dispatcher;
        if (dispatcher) {
            switch (dispatcher.type) {
                case 'file':
                    return new FileDispatcher(dispatcher.filePath);
                case 'haystack_agent':
                    return new RemoteGrpcAgentDispatcher(dispatcher.agentHost, dispatcher.agentPort, config.logger);
                case 'http_collector':
                    return new HttpCollectorDispatcher(dispatcher.collectorUrl, dispatcher.collectorHttpHeaders, config.logger);
                case 'in_memory':
                    return new InMemoryDispatcher();
                default:
                    throw new Error(`dispatcher of type ${dispatcher.type} is unknown in dispatcher config: ${JSON.stringify(dispatcher)}`);
            }
        }
        return new NoopDispatcher();
    }
}
