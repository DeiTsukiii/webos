import { commands } from "./bin/all.js";

const content = document.getElementById('content');
let cursorPosition = 0;
let currentPath = "/home/user";
let myUsername = "";
let inputHistory = [""];
let inputHistoryIndex = 0;

let inputType = null;

async function initShell() {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('user')) window.location.href = '/login';
    const response = await fetch(`/api/user?token=${encodeURIComponent(urlParams.get('user'))}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
        window.location.href = '/login';
        return;
    }

    myUsername = data.user.username;
    currentPath = `/home/${myUsername}`;

    content.innerHTML += `<span class="line">Welcome back, ${myUsername}!</span>`;
}

function ansiToHtml(lines) {
    const ansiClasses = {
        '1': 'transparent',
        '30': 'black',   '90': 'black2',
        '31': 'red',     '91': 'red2',
        '32': 'green',   '92': 'green2',
        '33': 'yellow',  '93': 'yellow2',
        '34': 'blue',    '94': 'blue2',
        '35': 'purple',  '95': 'purple2',
        '36': 'cyan',    '96': 'cyan2',
        '37': 'white',   '97': 'white2',

        '40': 'bg-black','100': 'bg-black2',
        '41': 'bg-red',  '101': 'bg-red2',
        '42': 'bg-green','102': 'bg-green2',
        '43': 'bg-yellow','103': 'bg-yellow2',
        '44': 'bg-blue', '104': 'bg-blue2',
        '45': 'bg-purple','105': 'bg-purple2',
        '46': 'bg-cyan', '106': 'bg-cyan2',
        '47': 'bg-white','107': 'bg-white2',
    };

    if (typeof lines === 'object') {
        const output = [];
        lines.forEach(line => {
            output.push(line.replaceAll('>', '&gt;').replaceAll('<', '&lt;').replace(/\e\[(\d+)m/g, (match, code) => {
                if (code === '0') return '</span>';
                const cls = ansiClasses[code];
                return cls ? `<span class="${cls}">` : match;
            }));
        });
        return output;
    } else return lines.replaceAll('>', '&gt;').replaceAll('<', '&lt;').replace(/\e\[(\d+)m/g, (match, code) => {
        if (code === '0') return '</span>';
        const cls = ansiClasses[code];
        return cls ? `<span class="${cls}">` : match;
    });
}

function resolvePath(current, target) {
    const normalizedTargetPath = target.replace('~', '/home/user');

    const baseParts = current.split('/').filter(p => p.length > 0);
    const targetParts = normalizedTargetPath.split('/').filter(p => p.length > 0);
    const resolvedParts = normalizedTargetPath.startsWith('/') ? [] : [...baseParts];

    for (const part of targetParts) {
        if (part === '..' && resolvedParts.length > 0) resolvedParts.pop();
        else if (!['..', '.'].includes(part)) resolvedParts.push(part);
    }
    
    return '/' + resolvedParts.join('/');
}

function getCtx() {
    return {
        set currentPath (newPath) { currentPath = newPath; },
        get currentPath () { return currentPath; },
        myUsername,
        resolvePath: (target) => resolvePath(currentPath, target),
    };
}

async function executeCommand(command, operands, flags, redirectToFile, appendMode) {
    const commandPath = `/bin/${command}`;

    let result = `bash: ${command}: command not found...`;

    if (commands[command]) {
        result = await commands[command]({ operands, flags, ctx: getCtx(), token: (new URLSearchParams(window.location.search)).get('user') });
    }

    // if (redirectToFile) {
    //     const resolveRedirect = resolvePath(currentPath, redirectToFile);
    //     const parentSplit = resolveRedirect.split('/')
    //     parentSplit.pop();
    //     const parentPath = parentSplit.join('/');
    //     const readedParent = readPath(parentPath);
    //     if (readedParent.error) return readedParent.error === 'fileNotExist' ? `bash: ${redirectToFile}: No such file or directory` : readedParent.error;
    //     else if (readedParent.perms && readedParent.perms[0] !== 'd') return `bash: ${redirectToFile}: Not a directory`;
    //     const writedFile = writeFile(resolveRedirect, result, appendMode ? 'w+' : 'w');
    //     if (writedFile.error) return writedFile.error === 'notAFile' ? `bash: ${redirectToFile}: Is a directory` : writedFile.error;
    //     else if (writedFile.permDenied) return `bash: ${redirectToFile}: Permission denied`;
    //     return '';
    // }
    return ansiToHtml(result);
}

function parseCommand(commandString) {
    const operands = [];
    const flags = [];
    let redirectToFile = null;
    let appendMode = false;
    const regex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|>>|>|--[a-zA-Z0-9=_-]+|-[a-zA-Z0-9]+|\S+)/g;
    let match;
    let expectingRedirectTarget = false;
    let first = true;
    let cmdName;
    
    while ((match = regex.exec(commandString)) !== null) {
        let arg = match[1];

        if (first) {
            cmdName = arg;
            first = false;
            continue;
        }

        if (expectingRedirectTarget) {
            redirectToFile = arg;
            if (arg.startsWith('"') && arg.endsWith('"')) redirectToFile = arg.substring(1, arg.length - 1);
            else if (arg.startsWith("'") && arg.endsWith("'")) redirectToFile = arg.substring(1, arg.length - 1);
            expectingRedirectTarget = false;
            continue;
        }

        if (arg === '>') {
            appendMode = false;
            expectingRedirectTarget = true;
            continue;
        } else if (arg === '>>') {
            appendMode = true;
            expectingRedirectTarget = true;
            continue;
        }

        if (arg.startsWith('"') && arg.endsWith('"')) operands.push(arg.substring(1, arg.length - 1));
        else if (arg.startsWith("'") && arg.endsWith("'")) operands.push(arg.substring(1, arg.length - 1));
        else if (arg.startsWith('--')) flags.push(arg.substring(2));
        else if (arg.startsWith('-') && arg.length > 1) {
            for (let i = 1; i < arg.length; i++) flags.push(arg[i]);
        } else operands.push(arg);
    }
    if (expectingRedirectTarget) return { cmdName, operands, flags, redirectToFile: undefined, appendMode };
    else return { cmdName, operands, flags, redirectToFile, appendMode };
}

async function sendCommand(activeLine, fullCommand) {
    const textCommand = fullCommand.textContent;
    const { cmdName, operands, flags, redirectToFile, appendMode } = parseCommand(textCommand.replace(/\\/g, "\ "));
    inputHistoryIndex = inputHistory.length - 1;
    inputHistory[inputHistoryIndex] = textCommand;
    inputHistory = inputHistory.filter((input, index) => input && input !== inputHistory[index - 1]);
    inputHistory.push("");
    inputHistoryIndex = inputHistory.length - 1;

    activeLine.classList.remove('active');
    const cursor = content.querySelector('.cursor');
    if (cursor) cursor.remove();
    fullCommand.textContent = textCommand;


    content.innerHTML += `<span class="line active" id="line-wait"><span class="input"><span class="cursor"></span></span></span>`;
    location.href = '#down';

    const executedCommand = await executeCommand(cmdName, operands, flags, redirectToFile, appendMode);

    document.getElementById('line-wait').remove();
    if (textCommand && executedCommand.length) content.innerHTML += `<span class="line">${executedCommand}</span>`;

    content.innerHTML += `<span class="line active">${ansiToHtml(`\e[92m${myUsername}@webos\e[0m:\e[92m${currentPath.replace(`/home/${myUsername}`, '~')}\e[0m$`)} <span class="input"><span class="cursor"></span></span></span>`;
    location.href = '#down';
}

function updateCursor(command) {
    const cursor = command.querySelector('.cursor') || document.createElement('span');
    cursor.className = 'cursor';
    const text = command.textContent.replace(/\u00A0/g, '');
    command.innerHTML = '';
    cursor.innerHTML = text.slice(cursorPosition, cursorPosition + 1);
    const before = document.createTextNode(text.slice(0, cursorPosition));
    const after = document.createTextNode(text.slice(cursorPosition + 1));
    command.appendChild(before);
    command.appendChild(cursor);
    command.appendChild(after);
}

function handleConsoleKeydown(event) {
    const key = event.key;
    const activeLine = document.querySelector('.line.active');
    if (!activeLine) return;
    const command = activeLine.querySelector('.input');

    event.preventDefault();

    if (key === 'Backspace') {
        const text = command.textContent;
        if (cursorPosition > 0) {
            command.textContent = text.slice(0, cursorPosition - 1) + text.slice(cursorPosition);
            cursorPosition--;
            updateCursor(command);
        }
    } else if (key === 'Delete') {
        const text = command.textContent;
        if (cursorPosition < text.length) {
            command.textContent = text.slice(0, cursorPosition) + text.slice(cursorPosition + 1);
            updateCursor(command);
        }
    } else if (key === 'Enter') {
        sendCommand(activeLine, command);
        cursorPosition = 0;
    } else if (event.ctrlKey && key === 'l') {
        const lines = content.querySelectorAll('.line:not(.active)');
        lines.forEach(line => line.remove());
        inputHistory[inputHistoryIndex] = command.textContent;
    } else if (key === 'ArrowLeft') {
        if (cursorPosition > 0) cursorPosition--;
        updateCursor(command);
    } else if (key === 'ArrowRight') {
        if (cursorPosition < command.textContent.length) cursorPosition++;
        updateCursor(command);
    } else if (key === 'ArrowUp') {
        if (inputHistoryIndex > 0) inputHistoryIndex--;
        command.textContent = inputHistory[inputHistoryIndex];
        cursorPosition = command.textContent.length;
        updateCursor(command);
    } else if (key === 'ArrowDown') {
        if (inputHistoryIndex < inputHistory.length - 1) inputHistoryIndex++;
        command.textContent = inputHistory[inputHistoryIndex];
        updateCursor(command);
        cursorPosition = command.textContent.length;
    } else if (key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        const text = command.textContent;
        command.textContent = text.slice(0, cursorPosition) + key + text.slice(cursorPosition);
        cursorPosition++;
        updateCursor(command);
    }
}

document.addEventListener('keydown', handleConsoleKeydown);
initShell().then(() => {
    content.innerHTML = `<span class="line active">${ansiToHtml(`\e[92m${myUsername}@webos\e[0m:\e[92m${currentPath.replace(`/home/${myUsername}`, '~')}\e[0m$`)} <span class="input"><span class="cursor"></span></span></span>`;
});