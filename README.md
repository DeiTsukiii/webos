# WebOS: The Online Terminal

**An interactive, multi-user, web-based Unix-like terminal simulated entirely in your browser.**

## What is WebOS?

**WebOS** is an ambitious simulation of a Linux-style operating system that is **accessible online** and runs entirely in a web browser. This is not just a fake terminal; it's a complete **multi-user ecosystem** where **anyone can create an account**.

It features a transactional backend (using Node.js on Netlify Functions and a PostgreSQL database) that manages a persistent, shared file system for every user, complete with permissions, ownership, and resource quotas.

## Core Features

* **True Multi-User Environment:** Anyone can sign up for an account and get their own persistent `/home/[username]` directory.
* **Virtual File System:** A complete filesystem stored in a database. All file operations (`ls`, `rm`, `mv`, `cp`, `mkdir`, `touch`) are real, persistent, and transactional.
* **Unix Permissions System:**
    * **Permissions:** Full `chmod` support (using both numeric `755` and string `rwxr-xr-x` formats).
    * **Privilege Escalation:** A working `sudo` command that validates the user's password for protected operations.
* **Resource Management:**
    * **Storage Quotas:** Each user is limited to a **5MB quota** in their home directory to prevent abuse.
* **Powerful Shell Functionality:**
    * **Pipes (`|`)**: The shell correctly handles pipes, allowing the output of one command to be used as the input for the next (e.g., `ls | wc -l`).
    * **I/O Redirection (`>`, `>>`):** Output can be redirected and appended to files.

## Available Commands

This is a list of all built-in commands currently available in the WebOS shell.

| **Command** | **Description** | **Example** |
| :--- | :--- | :--- |
| **Filesystem** | | |
| `ls` | Lists files and directories with permissions. | `ls -l /home` |
| `cat` | Displays the content of a file. | `cat /home/deitsuki/readme.txt` |
| `rm` | Removes files. Supports `-r` for directories. | `rm -r old_folder` |
| `mv` | Moves or renames a file or directory. | `mv file.txt docs/file.txt` |
| `cp` | Copies files. Supports `-r` for directories. | `cp -r project/ project_backup/` |
| `mkdir` | Creates a new directory. | `mkdir my_project` |
| `touch` | Creates a new empty file. | `touch new_file.js` |
| **Permissions** | | |
| `chmod` | Changes the permissions of a file. | `chmod 755 script.js` |
| `sudo` | Executes a command as the superuser. | `sudo rm /etc/config` |
| **User** | | |
| `passwd` | Changes your own user password. | `passwd` |
| `whoami` | Displays your current username. | `whoami` |
| **Utilities** | | |
| `grep` | Searches for a pattern in a file or input. | `ls \| grep ".js"` |
| `wc` | Counts lines, words, and bytes (`-l`, `-w`, `-c`). | `cat file.txt \| wc -l` |
| `date` | Displays the current date and time. | `date` |
| `help` | Lists all available commands. | `help` |
| `echo` | Prints text to the terminal (used for redirection). | `echo "Hello" > file.txt` |
| `clear` | Clears the terminal screen. | `clear` |

## Tech Stack

* **Frontend:** Plain JavaScript, HTML, and Tailwind CSS.
* **Backend:** Node.js (running on Netlify Serverless Functions).
* **Database:** PostgreSQL (to store all users and the entire file system).
* **Authentication:** JSON Web Tokens (JWT) for managing user sessions.
* **Password Hashing:** `bcrypt.js` for securely storing user passwords.
