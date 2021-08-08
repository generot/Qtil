const fetch = require("node-fetch").default;

/**
 * @param {string} url 
 * @param {object} jsonBody
 * @param {string} givenMethod
 */
function SendData(url, jsonBody, givenMethod = "POST") {
    return fetch(url, {
        method: givenMethod,
        headers: {
            "Content-Type": "application/json"
        },
        body: givenMethod != "GET" ? JSON.stringify(jsonBody) : null
    });
}

/**
 * @param {Array<string>} snippets
 * @param {string} lang 
 */
function WrapSnippets(snippets, lang) {
    const text = snippets.reduce((acc, next) => acc += next);
    lang = lang == "txt" ? "" : lang;

    return {
        content: `\`\`\`${lang}\n${text}\`\`\``
    };
}

module.exports = { SendData, WrapSnippets };