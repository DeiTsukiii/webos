import { catMain } from "./cat.js";
import { cdMain } from "./cd.js";
import { chmodMain } from "./chmod.js";
import { clearMain } from "./clear.js";
import { cpMain } from "./cp.js";
import { dateMain } from "./date.js";
import { echoMain } from "./echo.js";
import { grepMain } from "./grep.js";
import { helpMain } from "./help.js";
import { lsMain } from "./ls.js";
import { mkdirMain } from "./mkdir.js";
import { mvMain } from "./mv.js";
import { passwdMain } from "./passwd.js";
import { pwdMain } from "./pwd.js";
import { rmMain } from "./rm.js";
import { touchMain } from "./touch.js";
import { whoamiMain } from "./whoami.js";

export const commands = {
    ls: lsMain,
    cd: cdMain,
    pwd: pwdMain,
    cat: catMain,
    echo: echoMain,
    clear: clearMain,
    whoami: whoamiMain,
    date: dateMain,
    touch: touchMain,
    mkdir: mkdirMain,
    rm: rmMain,
    mv: mvMain,
    help: helpMain,
    chmod: chmodMain,
    cp: cpMain,
    passwd: passwdMain,
    grep: grepMain
}