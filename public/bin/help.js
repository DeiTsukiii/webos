import { commands } from "./all.js";

export async function helpMain(data) {
    return `Available Commands: \n    - ${Object.keys(commands).join("\n    - ")}`;
}