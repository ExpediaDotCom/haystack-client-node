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

import * as fs from "fs";
import Span from "../span";
import {Dispatcher} from "./dispatcher";

export default class FileDispatcher implements Dispatcher {
    _spanFileStream: fs.WriteStream;

    constructor(_filePath: string) {
        if(!_filePath) {
            throw new Error(`Fail to create file dispatcher without valid 'filePath' in the config`);
        }
        this._spanFileStream = fs.createWriteStream(_filePath, { 'flags': 'a' });
    }

    name() {
        return "FileDispatcher";
    }

    dispatch(span: Span) {
        this._spanFileStream.write(span.toString());
        this._spanFileStream.write("\n");
    }

    close(callback: () => void) {
        this._spanFileStream.end("\n");
        if (callback) {
            callback();
        }
    }
}

