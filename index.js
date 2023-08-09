const cors = require("cors");
const express = require("express");
const app = express();
const WSServer = require("express-ws")(app);
const aWss = WSServer.getWss();

const PORT = process.env.PORT || 5000;

let rooms = {
    // example: {
    //     password: "",
    //     users: [],
    //     owner: "",
    //     items: [
    // {
    //     imgUrl: "https://i.ytimg.com/vi/o2HhFAWh-rs/hqdefault.jpg?sqp=-oaymwEjCPYBEIoBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLCQGIYTzUx6MHANlhHZKx0ofjiZvg",
    //     title: "Dido - Thank You (Thunderstorm Remix) 1 Hour Loop",
    //     ytUrl: "https://www.youtube.com/watch?v=o2HhFAWh-rs",
    // }
    // ],
    //     currentItem: "",
    //     currentTime: 0,
    //     isPlay: false,
    // },
};

app.use(cors());

app.get("/", (req, res) => {
    res.send("");
});

app.ws("/", (ws) => {
    console.log("server - user connected");

    ws.on("close", () => {
        console.log(aWss.clients.size);
    });

    ws.on("message", (message) => {
        let parsedMessage = JSON.parse(message);

        switch (parsedMessage.method) {
            case "connection":
                console.log(aWss.clients.size);
                break;

            case "leaveTheRoom":
                leaveTheRoomHandler(ws, parsedMessage);
                break;

            case "setVideo":
                setVideoHandler(parsedMessage);
                break;

            case "play":
            case "pause":
                playPauseHandler(parsedMessage);
                break;

            case "seekTo":
                seekToHandler(parsedMessage);
                break;

            case "enterRoom":
                enterRoomHandler(ws, parsedMessage);
                break;

            case "createRoom":
                createRoomHandler(ws, parsedMessage);
                break;

            case "synchronizePlayerItem":
                synchronizePlayerItemHandler(ws, parsedMessage);
                break;

            case "synchronizePlayerTime":
                synchronizePlayerTimeHandler(ws, parsedMessage);
                break;

            case "saveCurrentPlayerTime":
                saveCurrentPlayerTimeHandler(parsedMessage);
                break;

            case "addVideo":
                addVideoHandler(parsedMessage);
                break;

            case "deleteVideo":
                deleteVideoHandler(parsedMessage);
                break;

            case "setIsRepeatVideo":
                setIsRepeatVideoHandler(parsedMessage);
                break;

            case "checkRoom":
                checkRoomHandler(ws, parsedMessage);
                break;

            case "setPlaylist":
                setPlaylistHandler(parsedMessage);
                break;
        }
    });
});

app.listen(PORT, () => console.log(`server started on port - ${PORT}`));

function broadcast(obj, roomId) {
    rooms[roomId].users.forEach((user) => {
        user.send(JSON.stringify(obj));
    });
}

function checkRoomHandler(ws, parsedMessage) {
    isHaveRoom = false;

    if (rooms[parsedMessage.roomId]) isHaveRoom = true;

    ws.send(
        JSON.stringify({
            method: "checkRoom",
            isHaveRoom: isHaveRoom,
        })
    );
}

function leaveTheRoomHandler(ws, parsedMessage) {
    if (parsedMessage.roomId && parsedMessage.username) {
        if (rooms[parsedMessage.roomId].users.length === 1) {
            delete rooms[parsedMessage.roomId];
        } else {
            rooms[parsedMessage.roomId].users = rooms[parsedMessage.roomId].users.filter(
                (elem) => elem.username !== parsedMessage.username
            );

            rooms[parsedMessage.roomId].owner = rooms[parsedMessage.roomId].users[0];

            rooms[parsedMessage.roomId].owner.send(
                JSON.stringify({
                    method: "setOwner",
                })
            );

            broadcast(
                {
                    method: "synchronizeMembers",
                    members: rooms[parsedMessage.roomId].users.map((elem) => elem.username),
                },
                parsedMessage.roomId
            );
        }
    }

    ws.username = "";
}

function setVideoHandler(parsedMessage) {
    rooms[parsedMessage.roomId].currentItem = parsedMessage.link;

    broadcast(
        {
            method: "setVideo",
            link: parsedMessage.link,
        },
        parsedMessage.roomId
    );
}

function playPauseHandler(parsedMessage) {
    broadcast(
        {
            method: `${parsedMessage.method}`,
        },
        parsedMessage.roomId
    );
}

function seekToHandler(parsedMessage) {
    broadcast(
        {
            method: "seekTo",
            seconds: parsedMessage.seconds,
        },
        parsedMessage.roomId
    );
}

function enterRoomHandler(ws, parsedMessage) {
    if (!rooms[parsedMessage.roomId]) {
        ws.send(
            JSON.stringify({
                method: "error",
                where: "roomId",
                text: "(This room ID does not exist)",
            })
        );

        return;
    }

    if (rooms[parsedMessage.roomId].password !== parsedMessage.password) {
        ws.send(
            JSON.stringify({
                method: "error",
                where: "password",
                text: "(Wrong password)",
            })
        );

        return;
    }

    if (rooms[parsedMessage.roomId].users.findIndex((elem) => elem.username === parsedMessage.username) !== -1) {
        ws.send(
            JSON.stringify({
                method: "error",
                where: "username",
                text: "(This username is already using in this room)",
            })
        );

        return;
    }

    rooms[parsedMessage.roomId].users.push(ws);

    ws.username = parsedMessage.username;

    ws.send(
        JSON.stringify({
            method: "synchronizeItems",
            items: rooms[parsedMessage.roomId].items,
        })
    );

    broadcast(
        {
            method: "synchronizeMembers",
            members: rooms[parsedMessage.roomId].users.map((elem) => elem.username),
        },
        parsedMessage.roomId
    );

    ws.send(
        JSON.stringify({
            method: "redirect",
            roomId: parsedMessage.roomId,
        })
    );
}

function createRoomHandler(ws, parsedMessage) {
    if (!rooms[parsedMessage.roomId]) {
        rooms[parsedMessage.roomId] = {
            password: parsedMessage.password,
            users: [ws],
            owner: ws,
            items: [
                // {
                //     imgUrl: "https://i.ytimg.com/vi/o2HhFAWh-rs/hqdefault.jpg?sqp=-oaymwEjCPYBEIoBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLCQGIYTzUx6MHANlhHZKx0ofjiZvg",
                //     title: "Dido - Thank You (Thunderstorm Remix) 1 Hour Loop",
                //     ytUrl: "https://www.youtube.com/watch?v=o2HhFAWh-rs",
                // },
                // {
                //     imgUrl: "https://i.ytimg.com/vi/iZEca2A3tS4/hq720.jpg?sqp=-oaymwExCNAFEJQDSFryq4qpAyMIARUAAIhCGAHwAQH4Af4JgALQBYoCDAgAEAEYZSBlKGUwDw==&rs=AOn4CLB5DlzIJqKTYfEklJflqOFvzALL9w",
                //     title: "INSTASAMKA - ЗА ДЕНЬГИ ДА (prod. realmoneyken)",
                //     ytUrl: "https://www.youtube.com/watch?v=iZEca2A3tS4",
                // },
                // {
                //     imgUrl: "https://i.ytimg.com/vi/vmqAAitN_QY/hq720.jpg?sqp=-oaymwEXCNAFEJQDSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLB7_2nrLb36I-5qs9dtI0Oy9tUFyw",
                //     title: "ЧИПСЫ ЗА 1$ vs 860$",
                //     ytUrl: "https://www.youtube.com/watch?v=vmqAAitN_QY",
                // },
            ],
            currentItem: "",
            currentTime: 0,
            isPlay: false,
        };

        ws.username = parsedMessage.username;

        ws.send(
            JSON.stringify({
                method: "synchronizeItems",
                items: rooms[parsedMessage.roomId].items,
            })
        );

        ws.send(
            JSON.stringify({
                method: "synchronizeMembers",
                members: rooms[parsedMessage.roomId].users.map((elem) => elem.username),
            })
        );

        ws.send(
            JSON.stringify({
                method: "redirect",
                roomId: parsedMessage.roomId,
                items: rooms[parsedMessage.roomId].items,
            })
        );
    } else {
        ws.send(
            JSON.stringify({
                method: "error",
                where: "roomId",
                text: "(This room ID is already using)",
            })
        );
    }
}

function synchronizePlayerItemHandler(ws, parsedMessage) {
    ws.send(
        JSON.stringify({
            method: "synchronizePlayerItem",
            currentItem: rooms[parsedMessage.roomId].currentItem,
        })
    );
}

function synchronizePlayerTimeHandler(ws, parsedMessage) {
    ws.send(
        JSON.stringify({
            method: "synchronizePlayerTime",
            time: rooms[parsedMessage.roomId].isPlay
                ? rooms[parsedMessage.roomId].currentTime + 1
                : rooms[parsedMessage.roomId].currentTime,
            isPlay: rooms[parsedMessage.roomId].isPlay,
        })
    );
}

function saveCurrentPlayerTimeHandler(parsedMessage) {
    rooms[parsedMessage.roomId].currentTime = parsedMessage.currentTime;
    rooms[parsedMessage.roomId].isPlay = parsedMessage.isPlay;
}

function addVideoHandler(parsedMessage) {
    rooms[parsedMessage.roomId].items.push(parsedMessage.item);

    broadcast(
        {
            method: "synchronizeItems",
            items: rooms[parsedMessage.roomId].items,
        },
        parsedMessage.roomId
    );
}

function deleteVideoHandler(parsedMessage) {
    if (rooms[parsedMessage.roomId].currentItem === parsedMessage.url) {
        let currentId = rooms[parsedMessage.roomId].items.findIndex((elem) => elem.ytUrl === parsedMessage.url);

        if (rooms[parsedMessage.roomId].items[currentId + 1]) {
            broadcast(
                {
                    method: "setVideo",
                    link: rooms[parsedMessage.roomId].items[currentId + 1].ytUrl,
                },
                parsedMessage.roomId
            );

            rooms[parsedMessage.roomId].currentItem = rooms[parsedMessage.roomId].items[currentId + 1].ytUrl;
        } else {
            broadcast(
                {
                    method: "setVideo",
                    link: "",
                },
                parsedMessage.roomId
            );

            rooms[parsedMessage.roomId].currentItem = "";
        }
    }

    rooms[parsedMessage.roomId].items = rooms[parsedMessage.roomId].items.filter(
        (elem) => elem.ytUrl !== parsedMessage.url
    );

    broadcast(
        {
            method: "synchronizeItems",
            items: rooms[parsedMessage.roomId].items,
        },
        parsedMessage.roomId
    );
}

function setIsRepeatVideoHandler(parsedMessage) {
    broadcast(
        {
            method: "setIsRepeatVideo",
            isRepeatVideo: parsedMessage.isRepeatVideo,
        },
        parsedMessage.roomId
    );
}

function setPlaylistHandler(parsedMessage) {
    rooms[parsedMessage.roomId].items = parsedMessage.playlist;

    broadcast(
        {
            method: "setPlaylist",
            playlist: parsedMessage.playlist,
        },
        parsedMessage.roomId
    );
}
