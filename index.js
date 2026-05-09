// ======================================================
// CHATGPT-STYLE DISCORD AI ASSISTANT
// ULTIMATE AI WORKSPACE VERSION
// ======================================================
//
// FEATURES
// ✅ ChatGPT-style AI
// ✅ Bahasa Indonesia default
// ✅ Smooth streaming response
// ✅ Research mode in chat
// ✅ AI status indicator
// ✅ Typing presence
// ✅ Processing animation
// ✅ Private AI channels
// ✅ Channel lock while generating
// ✅ SQLite memory
// ✅ File analyzer
// ✅ PDF / DOCX / TXT support
// ✅ AI moderation
// ✅ Image search
// ✅ Guild slash commands
//
// ======================================================
// INSTALL
// ======================================================
//
// npm init -y
//
// npm install discord.js axios dotenv
// npm install better-sqlite3
// npm install pdf-parse mammoth
//
// ======================================================
// .ENV
// ======================================================
//
// DISCORD_TOKEN=TOKEN_BOT
// CLIENT_ID=APPLICATION_ID
// GUILD_ID=SERVER_ID
// YOU_API_KEY=YOU_API_KEY
//
// ======================================================
// RUN
// ======================================================
//
// node index.js
//
// ======================================================

require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const Database = require("better-sqlite3");

const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

// ======================================================
// ENV
// ======================================================

const DISCORD_TOKEN =
    process.env.DISCORD_TOKEN;

const CLIENT_ID =
    process.env.CLIENT_ID;

const GUILD_ID =
    process.env.GUILD_ID;

const YOU_API_KEY =
    process.env.YOU_API_KEY;

// ======================================================
// CONFIG
// ======================================================

const AI_CHANNEL_NAME = "ai-chat";

// ======================================================
// CLIENT
// ======================================================

const client = new Client({

    intents: [

        GatewayIntentBits.Guilds,

        GatewayIntentBits.GuildMessages,

        GatewayIntentBits.MessageContent
    ]
});

// ======================================================
// DATABASE
// ======================================================

const db = new Database("memory.db");

db.prepare(`
CREATE TABLE IF NOT EXISTS memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    role TEXT,
    content TEXT
)
`).run();

// ======================================================
// MEMORY FUNCTIONS
// ======================================================

function saveMemory(
    userId,
    role,
    content
) {

    db.prepare(`
        INSERT INTO memory
        (userId, role, content)
        VALUES (?, ?, ?)
    `).run(
        userId,
        role,
        content
    );
}

function getMemory(userId) {

    return db.prepare(`
        SELECT *
        FROM memory
        WHERE userId = ?
        ORDER BY id DESC
        LIMIT 10
    `).all(userId).reverse();
}

function clearMemory(userId) {

    db.prepare(`
        DELETE FROM memory
        WHERE userId = ?
    `).run(userId);
}

// ======================================================
// MODERATION
// ======================================================

const bannedWords = [
    "kontol",
    "memek",
    "anjing",
    "babi"
];

function moderate(text) {

    const lower =
        text.toLowerCase();

    return bannedWords.some(
        word =>
            lower.includes(word)
    );
}

// ======================================================
// AI STATUS
// ======================================================

async function setAIStatus(
    channel,
    status
) {

    try {

        let cleanName =
            channel.name
                .replace("🟢-", "")
                .replace("🟡-", "")
                .replace("🔴-", "")
                .replace("📚-", "")
                .replace("🧠-", "");

        let newName = cleanName;

        switch (status) {

            case "idle":

                newName =
                    `🟢-${cleanName}`;

                break;

            case "thinking":

                newName =
                    `🟡-${cleanName}`;

                break;

            case "busy":

                newName =
                    `🔴-${cleanName}`;

                break;

            case "research":

                newName =
                    `📚-${cleanName}`;

                break;

            case "analyzing":

                newName =
                    `🧠-${cleanName}`;

                break;
        }

        await channel.setName(
            newName
        );

    } catch (error) {

        console.log(
            "AI status error:",
            error.message
        );
    }
}

// ======================================================
// CHANNEL LOCK
// ======================================================

async function setChannelLock(
    channel,
    userId,
    locked
) {

    try {

        await channel.permissionOverwrites.edit(

            userId,

            {
                SendMessages:
                    !locked
            }
        );

    } catch (error) {

        console.log(
            "Channel lock error:",
            error.message
        );
    }
}

// ======================================================
// PROCESSING ANIMATION
// ======================================================

async function startProcessingAnimation(
    message
) {

    const frames = [

        "⏳ Processing.",
        "⏳ Processing..",
        "⏳ Processing...",
        "🤖 AI sedang berpikir.",
        "🤖 AI sedang berpikir..",
        "🤖 AI sedang berpikir..."
    ];

    let i = 0;

    const interval = setInterval(
        async () => {

        try {

            await message.edit(
                frames[i]
            );

            i++;

            if (
                i >= frames.length
            ) i = 0;

        } catch {}

    }, 1200);

    return interval;
}

// ======================================================
// AI REQUEST
// ======================================================

async function askAI(
    userId,
    message,
    showSources = false
) {

    try {

        const history =
            getMemory(userId);

        const context =
            history
                .map(msg =>
                    `${msg.role}: ${msg.content}`
                )
                .join("\n");

        const response =
            await axios.post(

            "https://api.you.com/v1/research",

            {
                input:
`Kamu adalah AI assistant Discord yang sangat pintar seperti ChatGPT.

Selalu gunakan Bahasa Indonesia yang natural, modern, santai, jelas, dan mudah dimengerti.

Jika user menggunakan bahasa lain, balas menggunakan bahasa yang sama.

Gunakan gaya bicara AI modern yang:
- ramah
- pintar
- membantu
- natural
- tidak terlalu formal
- enak dibaca

Conversation History:
${context}

User:
${message}

Jawab secara natural.`,

                research_effort:
                    "standard"
            },

            {
                headers: {

                    "Content-Type":
                        "application/json",

                    "X-API-Key":
                        YOU_API_KEY
                }
            }
        );

        const output =
            response.data.output;

        const content =
            output.content;

        const sources =
            output.sources || [];

        saveMemory(
            userId,
            "user",
            message
        );

        saveMemory(
            userId,
            "assistant",
            content
        );

        // NORMAL MODE

        if (!showSources) {

            return {

                success: true,

                content: content
            };
        }

        // RESEARCH MODE

        let sourceText = "";

        sources
            .slice(0, 3)
            .forEach((src, i) => {

                sourceText +=
`\n[${i + 1}] ${src.title}
${src.url}`;
            });

        return {

            success: true,

            content:
                content +
                "\n\n📚 Sources:" +
                sourceText
        };

    } catch (error) {

        console.log(
            error.response?.data
        );

        console.log(
            error.message
        );

        return {

            success: false,

            content:
                "❌ Terjadi kesalahan pada AI service."
        };
    }
}

// ======================================================
// STREAMING
// ======================================================

async function streamMessage(
    messageObj,
    text
) {

    const chunkSize = 25;
    const delay = 30;

    let current = "";

    for (
        let i = 0;
        i < text.length;
        i += chunkSize
    ) {

        current += text.slice(
            i,
            i + chunkSize
        );

        try {

            await messageObj.edit(
                current.substring(
                    0,
                    1900
                ) + "▋"
            );

        } catch {}

        await new Promise(resolve =>
            setTimeout(resolve, delay)
        );
    }

    try {

        await messageObj.edit(
            current.substring(
                0,
                1900
            )
        );

    } catch {}
}

// ======================================================
// IMAGE SEARCH
// ======================================================

async function searchImage(query) {

    return `https://source.unsplash.com/1600x900/?${encodeURIComponent(query)}`;
}

// ======================================================
// FILE ANALYZER
// ======================================================

async function analyzeFile(
    url,
    fileName
) {

    try {

        const response =
            await axios({

                method: "GET",

                url: url,

                responseType:
                    "arraybuffer"
            });

        const filePath =
            path.join(
                __dirname,
                fileName
            );

        fs.writeFileSync(
            filePath,
            response.data
        );

        // PDF

        if (
            fileName.endsWith(".pdf")
        ) {

            const data =
                await pdfParse(
                    fs.readFileSync(
                        filePath
                    )
                );

            return data.text
                .substring(0, 5000);
        }

        // DOCX

        if (
            fileName.endsWith(".docx")
        ) {

            const result =
                await mammoth.extractRawText({

                    path: filePath
                });

            return result.value
                .substring(0, 5000);
        }

        // TXT

        if (
            fileName.endsWith(".txt")
        ) {

            return fs.readFileSync(
                filePath,
                "utf8"
            ).substring(0, 5000);
        }

        return
            "Format file tidak didukung.";

    } catch (error) {

        console.log(error);

        return
            "Gagal menganalisa file.";
    }
}

// ======================================================
// COMMANDS
// ======================================================

const commands = [

    new SlashCommandBuilder()
        .setName("ai")
        .setDescription("Chat dengan AI")
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Tanyakan apa saja")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("research")
        .setDescription("Research AI")
        .addStringOption(option =>
            option
                .setName("topic")
                .setDescription("Topik research")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("image")
        .setDescription("Cari gambar")
        .addStringOption(option =>
            option
                .setName("query")
                .setDescription("Keyword gambar")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("analyze")
        .setDescription("Analisa file upload"),

    new SlashCommandBuilder()
        .setName("reset")
        .setDescription("Reset memory AI"),

    new SlashCommandBuilder()
        .setName("privateai")
        .setDescription("Buat private AI channel")

].map(command =>
    command.toJSON()
);

// ======================================================
// REGISTER COMMANDS
// ======================================================

const rest = new REST({
    version: "10"
}).setToken(DISCORD_TOKEN);

(async () => {

    try {

        console.log(
            "Registering slash commands..."
        );

        await rest.put(

            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),

            {
                body: commands
            }
        );

        console.log(
            "Slash commands registered."
        );

    } catch (error) {

        console.error(error);
    }

})();

// ======================================================
// READY
// ======================================================

client.once(
    "clientReady",
    () => {

    console.log(
        `✅ Logged in as ${client.user.tag}`
    );

});

// ======================================================
// MESSAGE CREATE
// ======================================================

client.on(
    "messageCreate",
    async message => {

    if (message.author.bot)
        return;

    const isAIChannel =

        message.channel.name ===
        AI_CHANNEL_NAME ||

        message.channel.name.includes(
            "ai-"
        );

    const isMentioned =
        message.mentions.has(
            client.user
        );

    if (
        !isAIChannel &&
        !isMentioned
    ) return;

    let userMessage =
        message.content

            .replace(
                `<@${client.user.id}>`,
                ""
            )

            .trim();

    if (!userMessage)
        userMessage = "halo";

    if (
        moderate(userMessage)
    ) {

        return message.reply(
            "❌ Konten tidak diperbolehkan."
        );
    }

    let researchMode = false;

    if (
        userMessage.startsWith(
            "/research "
        )
    ) {

        researchMode = true;

        userMessage =
            userMessage.replace(
                "/research ",
                ""
            );
    }

    const typingInterval =
        setInterval(() => {

        message.channel.sendTyping();

    }, 5000);

    try {

        if (
            message.channel.name.includes(
                "ai-"
            )
        ) {

            await setChannelLock(

                message.channel,

                message.author.id,

                true
            );
        }

        if (researchMode) {

            await setAIStatus(
                message.channel,
                "research"
            );

        } else {

            await setAIStatus(
                message.channel,
                "thinking"
            );
        }

        const loading =
            await message.reply(
                "⏳ Processing..."
            );

        const animation =
            await startProcessingAnimation(
                loading
            );

        const result =
            await askAI(

                message.author.id,

                researchMode
                    ? `Research mendalam tentang: ${userMessage}`
                    : userMessage,

                researchMode
            );

        clearInterval(animation);

        if (!result.success) {

            return loading.edit(
                result.content
            );
        }

        await streamMessage(
            loading,
            result.content
        );

    } finally {

        clearInterval(
            typingInterval
        );

        if (
            message.channel.name.includes(
                "ai-"
            )
        ) {

            await setChannelLock(

                message.channel,

                message.author.id,

                false
            );
        }

        await setAIStatus(
            message.channel,
            "idle"
        );
    }
});

// ======================================================
// INTERACTION CREATE
// ======================================================

client.on(
    "interactionCreate",
    async interaction => {

    if (
        !interaction.isChatInputCommand()
    ) return;

    // ==========================================
    // /PRIVATEAI
    // ==========================================

    if (
        interaction.commandName ===
        "privateai"
    ) {

        const guild =
            interaction.guild;

        const channelName =
            `ai-${interaction.user.username}`
                .toLowerCase()
                .replace(
                    /[^a-z0-9-]/g,
                    ""
                );

        const existing =
            guild.channels.cache.find(
                c =>
                    c.name.includes(
                        channelName
                    )
            );

        if (existing) {

            return interaction.reply({

                content:
                    `✅ Channel AI kamu sudah ada: ${existing}`,

                ephemeral: true
            });
        }

        const channel =
            await guild.channels.create({

                name:
                    `🟢-${channelName}`,

                type:
                    ChannelType.GuildText,

                permissionOverwrites: [

                    {
                        id: guild.id,

                        deny: [
                            PermissionFlagsBits.ViewChannel
                        ]
                    },

                    {
                        id:
                            interaction.user.id,

                        allow: [

                            PermissionFlagsBits.ViewChannel,

                            PermissionFlagsBits.SendMessages,

                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    },

                    {
                        id:
                            client.user.id,

                        allow: [

                            PermissionFlagsBits.ViewChannel,

                            PermissionFlagsBits.SendMessages,

                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    }
                ]
            });

        return interaction.reply({

            content:
                `🤖 Private AI channel berhasil dibuat: ${channel}`,

            ephemeral: true
        });
    }

    // ==========================================
    // /RESET
    // ==========================================

    if (
        interaction.commandName ===
        "reset"
    ) {

        clearMemory(
            interaction.user.id
        );

        return interaction.reply({

            content:
                "🧠 Memory AI berhasil direset.",

            ephemeral: true
        });
    }

    // ==========================================
    // /IMAGE
    // ==========================================

    if (
        interaction.commandName ===
        "image"
    ) {

        const query =
            interaction.options.getString(
                "query"
            );

        const image =
            await searchImage(query);

        const embed =
            new EmbedBuilder()

            .setTitle(
                `🖼️ ${query}`
            )

            .setImage(image)

            .setColor(0xFD79A8);

        return interaction.reply({
            embeds: [embed]
        });
    }

    // ==========================================
    // /AI
    // ==========================================

    if (
        interaction.commandName ===
        "ai"
    ) {

        const msg =
            interaction.options.getString(
                "message"
            );

        await interaction.deferReply();

        const result =
            await askAI(
                interaction.user.id,
                msg,
                false
            );

        return interaction.editReply({
            content:
                result.content.substring(
                    0,
                    1900
                )
        });
    }

    // ==========================================
    // /RESEARCH
    // ==========================================

    if (
        interaction.commandName ===
        "research"
    ) {

        const topic =
            interaction.options.getString(
                "topic"
            );

        await interaction.deferReply();

        const result =
            await askAI(

                interaction.user.id,

                `Research mendalam tentang: ${topic}`,

                true
            );

        return interaction.editReply({
            content:
                result.content.substring(
                    0,
                    1900
                )
        });
    }

    // ==========================================
    // /ANALYZE
    // ==========================================

    if (
        interaction.commandName ===
        "analyze"
    ) {

        await interaction.reply({

            content:
                "📎 Upload PDF/DOCX/TXT dalam 60 detik.",

            ephemeral: true
        });

        const filter = m =>

            m.author.id ===
            interaction.user.id &&

            m.attachments.size > 0;

        try {

            const collected =
                await interaction.channel.awaitMessages({

                    filter,

                    max: 1,

                    time: 60000,

                    errors: ["time"]
                });

            const msg =
                collected.first();

            const attachment =
                msg.attachments.first();

            const extracted =
                await analyzeFile(

                    attachment.url,

                    attachment.name
                );

            const result =
                await askAI(

                    interaction.user.id,

                    `Analisa file berikut:\n\n${extracted}`,

                    false
                );

            await interaction.followUp({

                content:
                    result.content.substring(
                        0,
                        1900
                    )
            });

        } catch {

            await interaction.followUp({

                content:
                    "❌ Tidak ada file yang diupload."
            });
        }
    }
});

// ======================================================
// LOGIN
// ======================================================

client.login(DISCORD_TOKEN);