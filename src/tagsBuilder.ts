/*---------------------------------------------------------------------------------------------
*  Copyright (c) Alessandro Fragnani. All rights reserved.
*  Licensed under the MIT License. See License.md in the project root for license information.
*--------------------------------------------------------------------------------------------*/

'use strict';

import cp = require('child_process');
import vscode = require('vscode');
import path = require('path');
import fs = require('fs');
import { AbstractProvider } from "./abstractProvider";
var opener = require('opener');

export class TagsBuilder {

    public generateTags(basePath: string, update: boolean, showMessage?: boolean): Promise<string> {

        return new Promise<string>((resolve, reject) => {

            let command: string = update ? "global" : "gtags";
            let params: any = update ? ["--update"] : [];

            if (!TagsBuilder.tagsAvailable(path.join(basePath, 'GTAGS'))) {
                command = "gtags";
                params = [];
            }

			let statusBar: vscode.Disposable = vscode.window.setStatusBarMessage("Generating tags...");
            let p = cp.execFile(command, params, { cwd: basePath }, (err, stdout, stderr) => {
                try {
					statusBar.dispose();

                    if (err && (<any>err).code === 'ENOENT') {
                        vscode.window.showInformationMessage('The ' + command + ' command is not available. Make sure it is on PATH');
                        resolve('The ' + command + ' command is not available. Make sure it is on PATH');
                        return;
                    }
                    if (err) {
                        vscode.window.showInformationMessage('Some error occured: ' + err);
                        resolve('Some error occured: ' + err);
                        return;
                    }
                    if (stderr) {
                        vscode.window.showInformationMessage('Some error occured: ' + stderr);
                        resolve('Some error occured: ' + stderr);
                        return;
                    }

					if (showMessage) {
						vscode.window.showInformationMessage('The tags where updated');
					}
                    resolve("");
                    return;
                } catch (e) {
                    vscode.window.showInformationMessage('Some error occured: ' + e);
                    reject('Some error occured: ' + e);
                    return;
                }
            });

        });
    }
		
    public generateTagsForFile(fileName: string): Promise<string> {

        return new Promise<string>((resolve, reject) => {

			let basePath: string = AbstractProvider.basePathForFilename(fileName);
			let listTXT: string = path.join(basePath, 'GLIST');
			fs.writeFileSync(listTXT, fileName);

			let p = cp.execFile('gtags', ["--accept-dotfiles", "-f", listTXT], { cwd: basePath }, (err, stdout, stderr) => {
                try {
                    if (err && (<any>err).code === 'ENOENT') {
                        vscode.window.showInformationMessage('The \"global\" command is not available. Make sure it is on PATH');
                        resolve('The \"global\" command is not available. Make sure it is on PATH');
                        return;
                    }
                    if (err) {
                        vscode.window.showInformationMessage('Some error occured: ' + err);
                        resolve('Some error occured: ' + err);
                        return;
                    }
                    if (stderr) {
                        vscode.window.showInformationMessage('Some error occured: ' + stderr);
                        resolve('Some error occured: ' + stderr);
                        return;
                    }

                    resolve("");
                    return;
                } catch (e) {
                    vscode.window.showInformationMessage('Some error occured: ' + e);
                    reject('Some error occured: ' + e);
                    return;
                }
            });

        });
    }

	public static tagsAvailable(basePath: string): boolean {
		return fs.existsSync(path.join(basePath, 'GTAGS'));
	}
		
	public static checkGlobalAvailable(context: vscode.ExtensionContext): Promise<boolean> {

		return new Promise<boolean>((resolve, reject) => {

			// test
			let p = cp.execFile('global', [ '--help' ], { cwd: vscode.workspace.rootPath }, (err, stdout, stderr) => {
				try {

					// no error
					if (!err) {
						return resolve(true);
					}
					
					// error ?
					if (err) {

						if ((<any>err).code != 'ENOENT') {
							return resolve(true);
						}

						// should ask?
						let ask: boolean = context.globalState.get<boolean>("askforGlobalAvailable", true);
						if (!ask) {
							return resolve(false);
						}

						let moreInfo = <vscode.MessageItem>{
							title: "More Info"
						};
						let dontShowAgain = <vscode.MessageItem>{
							title: "Don't show again"
						};

						vscode.window.showInformationMessage('The "global" command is not available. Make sure it is on PATH', moreInfo, dontShowAgain).then(option => {

							if (typeof option === "undefined") {
								return resolve(false);
							}

							if (option.title === "More Info") {
								opener("https://github.com/budden/vscode-language-blackboxcomponentbuilder#code-navigation");
								return resolve(false);
							}

							if (option.title === "Don't show again") {
								context.globalState.update("askforGlobalAvailable", false);
								return resolve(false);
							}

							return resolve(false);
						});
					}
				} catch (e) {
					reject(e);
				}
			});

		});
	}
}
