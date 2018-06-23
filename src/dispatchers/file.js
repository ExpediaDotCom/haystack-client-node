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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var FileDispatcher = (function () {
    function FileDispatcher(_filePath) {
        this._spanFileStream = fs.createWriteStream(_filePath, { 'flags': 'a' });
    }
    FileDispatcher.prototype.name = function () {
        return "FileDispatcher";
    };
    FileDispatcher.prototype.dispatch = function (span) {
        this._spanFileStream.write(span.toString());
    };
    FileDispatcher.prototype.close = function (callback) {
        this._spanFileStream.end("\n");
        if (callback) {
            callback();
        }
    };
    return FileDispatcher;
}());
exports.default = FileDispatcher;
