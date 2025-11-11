import { catMain } from "./cat.js";
import { cdMain } from "./cd.js";
import { clearMain } from "./clear.js";
import { echoMain } from "./echo.js";
import { lsMain } from "./ls.js";
import { pwdMain } from "./pwd.js";

export const commands = {
    ls: lsMain,
    cd: cdMain,
    pwd: pwdMain,
    cat: catMain,
    echo: echoMain,
    clear: clearMain,
}

// INSERT INTO filesystem (path, parent_path, type, perms, creator, last_update) VALUES 
//   ('/bin/ls', '/bin', '-', 'rwxr-xr-x', 'root', NOW()),
//   ('/bin/cd', '/bin', '-', 'rwxr-xr-x', 'root', NOW()),
//   ('/bin/pwd', '/bin', '-', 'rwxr-xr-x', 'root', NOW()),
//   ('/bin/cat', '/bin', '-', 'rwxr-xr-x', 'root', NOW()),
//   ('/bin/echo', '/bin', '-', 'rwxr-xr-x', 'root', NOW()),
//   ('/bin/clear', '/bin', '-', 'rwxr-xr-x', 'root', NOW());