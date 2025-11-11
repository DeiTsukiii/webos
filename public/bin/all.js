import { catMain } from "./cat.js";
import { cdMain } from "./cd.js";
import { clearMain } from "./clear.js";
import { dateMain } from "./date.js";
import { echoMain } from "./echo.js";
import { lsMain } from "./ls.js";
import { mkdirMain } from "./mkdir.js";
import { mvMain } from "./mv.js";
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
}