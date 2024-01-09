import { logger } from "@vendetta";
import { registerCommand } from "@vendetta/commands"
import { findByProps } from "@vendetta/metro";

const MessageActions = findByProps("sendMessage", "sendBotMessage");
const MAX_PAGE = 476;
const MAX_PAGE_POSTS = 42;

let patches = []

async function sendRequest(dataSearchParams: URLSearchParams, page: number) {
    dataSearchParams.set("pid", page.toString());
    const info = await fetch("https://gelbooru.com/index.php?" + dataSearchParams).then(response => { return response.json(); });

    if (!info["@attributes"].count)
        return { info: null, posts: null };
    else
        return { info, posts: info["@attributes"].count };
}

function processArgument(args: any, arg_name: string, default_value: any = null) {
    if (!args) {
        return default_value;
    }

    for (const argument of args) {
        if (argument.name == arg_name) {
            return argument.value;
        }
    }
    return default_value;
}

export default {
    onLoad: () => {
        patches.push(registerCommand({
            // TODO: Autocomplete
            name: "booru",
            displayName: "booru",
            description: "Search images from booru",
            displayDescription: "Search images from booru",
            applicationId: '-1',
            inputType: 1,
            type: 1,
            options: [{
                name: "tags",
                displayName: "tags",
                description: "Tags or criteria (space is a separator between tags)", 
                displayDescription: "Tags or criteria (space is a separator between tags)",
                required: false,
                type: 3
            },
            {
                name: "rating",
                displayName: "rating",
                description: "Rating of images", 
                displayDescription: "Rating of images",
                required: false,
                type: 3,
                // @ts-ignore
                choices: [
                    { name: "General", displayName: "General", value: "general" },
                    { name: "Sensitive", displayName: "Sensitive", value: "sensitive" },
                    { name: "Questionable", displayName: "Questionable", value: "questionable" },
                    { name: "Explicit", displayName: "Explicit", value: "explicit" }
                ]
            },
            {
                name: "count",
                displayName: "count",
                description: "How many images to send (max 5)", 
                displayDescription: "How many images to send (max 5)",
                required: false,
                type: 4,
                // min_value: 1, // FIXME: no fucking idea, why it isnt working???
                // max_value: 5
            }],
            execute: async (args, ctx) => { 
                try {
		    let tags = processArgument(args, "tags", "").trim();
                    const rating = processArgument(args, "rating", "");
		    const count = processArgument(args, "count", 1);

                    if (rating) {
                        tags = tags + ` rating:${rating}`;
                    }
                    if (count > 5 || count < 1) {
                        return void MessageActions.sendBotMessage(ctx.channel.id, "Invalid `count` argument." );
                    }

                    logger.log(`Tags and Rating: ${tags}`);
                    logger.log(`Count: ${count}`);

                    const dataSearchParams = new URLSearchParams({
                        page: "dapi",
                        s: "post",
                        q: "index",
                        json: "1",
                        limit: MAX_PAGE_POSTS.toString(),
                    });
                    if (tags) {
                        dataSearchParams.set("tags", tags);
                    }

                    let response = await sendRequest(dataSearchParams, 0);

                    if (!response.posts) {
                        return void MessageActions.sendBotMessage(ctx.channel.id, "No results found." );
                    }
 
                    logger.log(`Pages: ${response.posts / MAX_PAGE_POSTS}\nPosts count: ${response.posts}`);
                    let page = Math.trunc(response.posts / MAX_PAGE_POSTS);
                    page = Math.floor(Math.random() * Math.min(page, MAX_PAGE));
                    logger.log(`Selected page: ${page}`);

                    const { info } = await sendRequest(dataSearchParams, page);
                    let random_posts = undefined;
                    let posts = [];
                    if (info.post.length <= count) {
                        random_posts = info.post;
                        logger.log(`The whole page has been selected (${info.post.length})`)
                    } else {
                        const random_post_number = Math.max(Math.floor(Math.random() * info.post.length - count), 0);
                        random_posts = info.post.slice(random_post_number, random_post_number + count);
                        logger.log(`Random Post Number: ${random_post_number} - ${random_post_number + count}\nPosts in the page: ${info.post.length}`);
                    }

                    for (let post of random_posts) {
                        posts.push(post.file_url);
                    };
                    MessageActions.sendMessage(ctx.channel.id, { content: posts.join("\n") });
                } catch (error) {
                    MessageActions.sendBotMessage(ctx.channel.id, `Something went wrong: \`${error}\``)
                }
            },
        }));
    },
    onUnload: () => {
        for (const unpatch of patches) unpatch();
    },
}
