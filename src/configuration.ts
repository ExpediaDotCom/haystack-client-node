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

import FileDispatcher from "./dispatchers/file";
import RemoteDispatcher from "./dispatchers/remote";
import {Dispatcher} from "./dispatchers/dispatcher";
import InMemoryDispatcher from "./dispatchers/in_memory";
import NoopDispatcher from "./dispatchers/noop";

export default class Configuration {
    static _getDispatcher(config): Dispatcher {

        let dispatcher = config.dispatcher;
        if (dispatcher) {
            switch (dispatcher.type) {
                case 'file':
                    return new FileDispatcher(dispatcher.filePath);
                case 'haystack_agent':
                    return new RemoteDispatcher(dispatcher.agentHost, dispatcher.agentPort, config.logger);
                case 'in_memory':
                    return new InMemoryDispatcher();
                default:
                    throw new Error(`reporter of type ${dispatcher} is not unknown`);
            }
        }
        return new NoopDispatcher();
    }
}
