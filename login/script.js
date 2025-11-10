const content = document.getElementById('content');
let cursorPosition = 0;
let inputHistory = [""];
let inputHistoryIndex = 0;

let currentState = 'command';
let storedCommand = '';
let storedUsername = '';
let isBusy = false;

async function sendCommand(activeLine, fullCommand) {
    if (isBusy) return;

    const textCommand = fullCommand.textContent.trim();
    activeLine.classList.remove('active');
    const cursor = activeLine.querySelector('.cursor');
    if (cursor) cursor.remove();
    fullCommand.textContent = textCommand;

    if (currentState === 'command') {
        if (textCommand === 'login' || textCommand === 'register') {
            storedCommand = textCommand;
            currentState = 'username';
            askFor("username: ");
        } else {
            content.innerHTML += `<span class="line red">Command not found. Type 'login' or 'register'.</span>`;
            askFor("command (login/register): ");
        }

    } else if (currentState === 'username') {
        storedUsername = textCommand;
        currentState = 'password';
        // ask for username@webos's password
        askFor(`${storedUsername}@webos's password: `, true);

    } else if (currentState === 'password') {
        const storedPassword = textCommand;
        const passLine = activeLine.querySelector('.password-input');
        if(passLine) passLine.textContent = ''; 

        currentState = 'authenticating';
        isBusy = true;
        
        if (storedCommand === 'login') {
            content.innerHTML += `<span class="line">Authenticating...</span>`;
            location.href = '#down';
            await handleLoginAttempt(storedUsername, storedPassword);
        } else if (storedCommand === 'register') {
            content.innerHTML += `<span class="line">Creating account...</span>`;
            location.href = '#down';
            await handleRegisterAttempt(storedUsername, storedPassword);
        }
    }
}

function askFor(promptText, isPassword = false) {
    const inputClass = isPassword ? 'input password-input' : 'input';
    content.innerHTML += `<span class="line active">${promptText}<span class="${inputClass}"><span class="cursor"> </span></span></span>`;
    location.href = '#down';
    cursorPosition = 0;
}

async function handleLoginAttempt(username, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });
        const data = await response.json();
        if (!response.ok || !data.success) { throw new Error(data.message); }

        content.innerHTML += `<span class="line green">Login successful! Welcome, ${data.user.username}.</span>`;
        content.innerHTML += `<span class="line">Redirecting to terminal...</span>`;
        window.location.href = '/?user=' + data.token;

        location.href = '#down';

    } catch (error) {
        content.innerHTML += `<span class="line red">${error.message}</span>`;
        resetToCommand();
    }
}

async function handleRegisterAttempt(username, password) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });
        const data = await response.json();
        if (!response.ok || !data.success) { throw new Error(data.message); }

        content.innerHTML += `<span class="line green">Account created successfully!</span>`;
        content.innerHTML += `<span class="line">Please 'login' to continue.</span>`;
        resetToCommand();

    } catch (error) {
        content.innerHTML += `<span class="line red">${error.message}</span>`;
        resetToCommand();
    }
}

function resetToCommand() {
    currentState = 'command';
    isBusy = false;
    storedCommand = '';
    storedUsername = '';
    askFor("command (login/register): ");
}

function updateCursor(command) {
    const cursor = command.querySelector('.cursor') || document.createElement('span');
    cursor.className = 'cursor';
    const text = command.textContent.replace(/\u00A0/g, '');
    command.innerHTML = '';
    cursor.innerHTML = text.slice(cursorPosition, cursorPosition + 1) || ' ';
    const before = document.createTextNode(text.slice(0, cursorPosition));
    const after = document.createTextNode(text.slice(cursorPosition + 1));
    command.appendChild(before);
    command.appendChild(cursor);
    command.appendChild(after);
}

function handleConsoleKeydown(event) {
    const key = event.key;
    const activeLine = document.querySelector('.line.active');
    if (!activeLine || isBusy) return;
    
    const command = activeLine.querySelector('.input');
    const isPassword = command.classList.contains('password-input');

    event.preventDefault();

    if (key === 'Backspace') {
        const text = command.textContent;
        if (cursorPosition > 0) {
            command.textContent = text.slice(0, cursorPosition - 1) + text.slice(cursorPosition);
            cursorPosition--;
            if (!isPassword) updateCursor(command);
        }
    } else if (key === 'Enter') {
        sendCommand(activeLine, command);
        cursorPosition = 0;
    } else if (key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        const text = command.textContent;
        command.textContent = text.slice(0, cursorPosition) + key + text.slice(cursorPosition);
        cursorPosition++;
        if (!isPassword) {
            updateCursor(command);
        }
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
    }
}

document.addEventListener('keydown', handleConsoleKeydown);
content.innerHTML = '<span class="line"><span class="green2">user@pc</span>:<span class="green2">~</span>$ <span class="input">ssh webos.deitsuki.games</span></span>';
resetToCommand();