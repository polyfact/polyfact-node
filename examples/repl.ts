import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Chat } from "../lib/index";

async function main() {
    const chat = new Chat({ autoMemory: true });

    const rl = readline.createInterface({ input, output });

    while (true) {
        const userInput = await rl.question("> ");

        const stream = chat.sendMessageStream(userInput);

        stream.pipe(output);
        await new Promise((res) => stream.on("end", res));
        output.write("\n");
    }
}

main();