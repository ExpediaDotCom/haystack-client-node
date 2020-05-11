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

import * as grpc from '@grpc/grpc-js';
import { SpanAgent } from '../proto_idl_codegen/agent/spanAgent_grpc_pb';
import {Dispatcher} from './dispatcher';
import Span from '../span';
import { Logger, NullLogger } from '../logger';
import Utils from '../utils';

export default class RemoteDispatcher implements Dispatcher {
    _client: any;
    _logger: any;

    constructor(agentHost: string = 'haystack-agent', agentPort: number = 35000, logger: Logger = new NullLogger()) {
        logger.info(`Initializing the remote grpc agent dispatcher, connecting at ${agentHost}:${agentPort}`);
        const SpanAgentClient = grpc.makeGenericClientConstructor(SpanAgent, 'SpanAgentService');
        this._client = new SpanAgentClient(`${agentHost}:${agentPort}`, grpc.credentials.createInsecure());
        this._logger = logger;
    }

    name(): string {
        return 'GrpcAgentDispatcher';
    }

    dispatch(span: Span, callback: (error) => void): void {
        const proto = Utils.convertToProtoSpan(span);
        this._client.dispatch(proto, (err, response) => {
            if (err) {
                if (this._logger) {
                    this._logger.error(`Fail to dispatch span to haystack-agent ${err.toString()}`);
                }
                if (callback) {
                    callback(new Error(err));
                }
            } else {
                if (this._logger) {
                    this._logger.debug(`grpc response code from haystack-agent - ${response.getCode()}`);
                }
                if (callback) {
                    callback(null);
                }
            }
        });
    }

    close(callback: () => void): void {
        grpc.closeClient(this._client);
        if (callback) {
            callback();
        }
    }
}
