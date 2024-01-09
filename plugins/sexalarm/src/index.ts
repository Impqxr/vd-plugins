import { logger } from "@vendetta";
import { findByProps } from "@vendetta/metro";
import { before } from "@vendetta/patcher";

const MessageActions = findByProps("sendMessage", "editMessage");
const URL = "https://tenor.com/view/sex-gif-14550948129943015206"; // TODO: put these urls in settings
const BRUTAL_URL = "https://tenor.com/view/honkai-honkai-star-rail-sex-sex-alarm-brutal-sex-alarm-gif-17568096709972150607";

let patches = []

function sendWithDelay(channel: number, content: string) {
    setTimeout(() => {
        MessageActions.sendMessage(channel, { content: content });
    }, 300);
}

const patchMessage = ([channel, message]: any[]) => {
    const sex = message.content.toLocaleLowerCase().split(/\W+/).filter(Boolean); // TODO: Detect url
    const occurrences = sex.reduce((count, word) => (word === "sex" ? count + 1 : count), 0);
    logger.log(sex, occurrences);
    if (sex.includes("sex") && !(message.content === URL) && !(message.content === BRUTAL_URL)) {
        occurrences >= 3 ? sendWithDelay(channel, BRUTAL_URL) : sendWithDelay(channel, URL);
    }
}

export default {
    onLoad: () => {
        patches.push(before("sendMessage", MessageActions, patchMessage));
    },
    onUnload: () => {
        for (const unpatch of patches) unpatch();
    },
}
