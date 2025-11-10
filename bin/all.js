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