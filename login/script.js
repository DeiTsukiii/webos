// login/script.js

const content = document.getElementById('content');
let cursorPosition = 0;
let inputHistory = [""];
let inputHistoryIndex = 0;

// --- GESTION DES ÉTATS COMPLEXES ---
let currentState = 'command'; // 'command', 'username', 'password', 'authenticating'
let storedCommand = ''; // 'login' or 'register'
let storedUsername = '';
let isBusy = false;

// --- FONCTION DE CONNEXION PRINCIPALE ---
async function sendCommand(activeLine, fullCommand) {
    if (isBusy) return;

    const textCommand = fullCommand.textContent.trim();
    // ... (Votre code de gestion de l'historique) ...

    // Verrouiller la ligne
    activeLine.classList.remove('active');
    const cursor = activeLine.querySelector('.cursor');
    if (cursor) cursor.remove();
    fullCommand.textContent = textCommand;

    // --- MACHINE À ÉTATS ---

    if (currentState === 'command') {
        // 1. L'utilisateur a tapé 'login' ou 'register'
        if (textCommand === 'login' || textCommand === 'register') {
            storedCommand = textCommand;
            currentState = 'username';
            askFor("username: ");
        } else {
            content.innerHTML += `<span class="line red">Command not found. Type 'login' or 'register'.</span>`;
            askFor("command (login/register): ");
        }

    } else if (currentState === 'username') {
        // 2. L'utilisateur a tapé son nom d'utilisateur
        storedUsername = textCommand;
        currentState = 'password';
        askFor("password: ", true); // true = password input

    } else if (currentState === 'password') {
        // 3. L'utilisateur a tapé son mot de passe
        const storedPassword = textCommand;
        // N'affiche pas le mot de passe tapé
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

// --- FONCTION POUR AFFICHER UN NOUVEAU PROMPT ---
function askFor(promptText, isPassword = false) {
    const inputClass = isPassword ? 'input password-input' : 'input';
    content.innerHTML += `<span class="line active">${promptText}<span class="${inputClass}"><span class="cursor"> </span></span></span>`;
    location.href = '#down';
    cursorPosition = 0;
}

// --- APPEL À L'API (Connexion) ---
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

// --- APPEL À L'API (Enregistrement) ---
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
        resetToCommand(); // Retourne au prompt 'login' ou 'register'

    } catch (error) {
        content.innerHTML += `<span class="line red">${error.message}</span>`;
        resetToCommand();
    }
}

// --- FONCTION DE RÉINITIALISATION ---
function resetToCommand() {
    currentState = 'command';
    isBusy = false;
    storedCommand = '';
    storedUsername = '';
    askFor("command (login/register): ");
}


// --- GESTION DU CURSEUR (Inchangé) ---
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

// --- GESTION DES TOUCHES (Inchangé, mais vérifiez la partie password) ---
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

// --- INITIALISATION (Modifiée) ---
document.addEventListener('keydown', handleConsoleKeydown);
content.innerHTML = '<span class="line">WebOS 1.0.0 LTS tty1</span>';
resetToCommand(); // Démarre le processus