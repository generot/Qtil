const vscode = require('vscode');

const { registerCommand, executeCommand } = vscode.commands;
const { SendData, WrapSnippets } = require("./src/send.js");

const MATCH_URL = "\\w+:\\/\\/\\S+";
const MAX_MESSAGE = 2000;

/**
 * @type {vscode.ExtensionContext}
 */
var globalContext = null;

/**
 * @param {vscode.TextEditor} editor 
 * @returns 
 */
function GetFileExt(editor) {
	const fileDir = editor.document.fileName;
	const fileExtension = fileDir.substring(fileDir.indexOf('.') + 1);

	return fileExtension;
}

async function AddWebhook() {
	const res = await vscode.window.showInputBox({
		title: "Add a Discord webhook.",
		prompt: "Enter your Webhook's URL here.",
		placeHolder: "https://webhook.com",
		ignoreFocusOut: true,
		validateInput: inp => {
			if(inp.match(MATCH_URL) == null)
				return "Invalid URL provided."

			return null;
		}
	});

	if(!res) return null;

	//Validate the URL
	try {
		await SendData(res, {}, "GET");
	} catch(err) {
		await vscode.window.showErrorMessage("An error occured when validating the URL");
		return null;
	}
	
	await globalContext.secrets.store("webhook-url", res);

	return res;
}

async function RemoveWebhook() { 
	const res = await vscode.window.showInputBox({
		title: "Are you sure you want to remove the current Webhook?",
		prompt: "Answer with 'yes' or 'no'(case insensitive).",
		validateInput: inp => {
			inp = inp.toLowerCase();
			if(inp != "yes" && inp != "no")
				return "Invalid answer";

			return null;
		}
	});

	if(res == "yes") {
		let str = await globalContext.secrets.get("webhook-url");
		if(str) await globalContext.secrets.delete("webhook-url"); 
	}
}

async function InitializeCursors() {
	const input = await vscode.window.showInputBox({
		title: "Number of cursors to initialize",
		placeHolder: "Example: 4",
		ignoreFocusOut: true
	});

	for(let i = 0; i < input; i++)
		executeCommand("editor.action.insertCursorBelow");
}

async function SendToWebhook() {
	let webhookURL = undefined;

	const textEditor = vscode.window.activeTextEditor;
	const fileExtension = GetFileExt(textEditor);

	const cursors = textEditor.selections.map(sel => sel.active);
	const contents = cursors.map(pos => textEditor.document.lineAt(pos).text + "\n");

	if(!(webhookURL = await globalContext.secrets.get("webhook-url"))) {
		const res = await AddWebhook();
		webhookURL = res;
	}
	
	SendData(webhookURL, WrapSnippets(contents, fileExtension));
}

async function SendDocument() {
	const currDoc = vscode.window.activeTextEditor.document;
	const text = currDoc.getText();

	let webhookURL = undefined;
	const fileExtension = GetFileExt(vscode.window.activeTextEditor);

	if(text.length > MAX_MESSAGE) {
		vscode.window.showErrorMessage(`Maximum message length(${MAX_MESSAGE} chars) exceeded.`);
		return false;
	}

	if(!(webhookURL = await globalContext.secrets.get("webhook-url"))) {
		const res = await AddWebhook();
		webhookURL = res;
	} 
	
	SendData(webhookURL, WrapSnippets([ text ], fileExtension));
}

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	globalContext = context;

	const disposables = [
		registerCommand("qtil.initCursors", InitializeCursors),
		registerCommand("qtil.webhookSend", SendToWebhook),
		registerCommand("qtil.removeWebhook", RemoveWebhook),
		registerCommand("qtil.changeWebhookUrl", async () => await AddWebhook()),
		registerCommand("qtil.sendDoc", async () => await SendDocument())
	];

	context.subscriptions.push(disposables);
}

function deactivate() {
	console.log("Goodbye!");
}

module.exports = {
	activate,
	deactivate
}
