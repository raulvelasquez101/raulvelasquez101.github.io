// selecting html elements for manipulation in program below
let chatPopup = document.querySelector(".chat-popup"),
    openChatButton = document.querySelector(".start-button-image"),
    submitButton = document.getElementById("cht-wndw-sbmt"),
    chatArea = document.querySelector(".chat-area"),
    closeChatButton = document.getElementById("chat-popup-button-close"),
    textInput = document.querySelector(".input-area-text"),
    openChatButtonText = document.querySelector(".start-button-text"),
    chatCover = document.querySelector(".chat-cover"),
    startChatButton = document.querySelector(".chat-cover-button"),
    minimizeChatButton = document.querySelector(".minimize-button"),
    textInputID = document.getElementById("cht-wndw-txt-ntr"),
    chatCoverListDropdown = document.getElementById("chat-cover-input-dropdown"),
    chatCoverListToggle = document.getElementById("chat-cover-input-dropdown-toggle"),
    chatCoverListDropdownMenu = document.getElementById("chat-cover-input-dropdown-menu"),
    chatCoverListValue = document.getElementById("chat-cover-input-dropdown-selected-value"),
    chatCoverTextInput = document.getElementById("chat-cover-input-text"),
    chatCoverVideo = document.getElementById("chat-cover-video"),
    chatCoverMessageContainer = document.getElementById("chat-cover-message-container"),
    chatCoverWaitMessage = document.getElementById("chat-cover-wait-message"),
    chatCoverCloseMessage = document.getElementById("chat-cover-close-message");

let xcallyWebSocket = null;
let userID; // this is used to identify the user on the CC server;
let chatIntervalID = { closeInterval: null, openInterval: null };
let ongoingChat = false;

function serverConnect() {
    function appendMessage(text) {
        const serverMessage = `<div class="server-message-container">
        <span class="server-message">${text}</span>
        </div>`;
        chatArea.insertAdjacentHTML("beforeend", serverMessage);
        updateScroll();
    };
    xcallyWebSocket = io("https://cx.oltpsys.com", {
        path: "/webChat/chatSocket/",
        timeout: 2000,
        reconnectionAttempts: 5
    });
    xcallyWebSocket.on("serverMessage", (text, callback) => {
        appendMessage(text);
        callback();
    })
    xcallyWebSocket.on("disconnect", (reason) => {
        if (reason === "io server disconnect" || reason === "io client disconnect") {
            appendMessage("¡Gracias por contactarnos! Hasta luego.")
        }
    })
    xcallyWebSocket.on("reconnect_failed", () => {
        if (chatPopup.classList.contains("show")) {
            chatCoverContentHandler("show close message");
        }
    })
    xcallyWebSocket.on("shutdown", (text) => {
        if (text != undefined) {
            chatCoverCloseMessage.innerHTML = text;
        }
        clearInterval(chatIntervalID.openInterval);
        clearInterval(chatIntervalID.closeInterval);
        chatCoverContentHandler("show close message");
        xcallyWebSocket != null ? xcallyWebSocket.disconnect() : null;
    })
}


function sendMsg(textMessage) {
    if (textMessage != undefined && userID != undefined && xcallyWebSocket != null) {
        if (textMessage.trim() != "") {
            xcallyWebSocket.emit("clientMessage", textMessage, userID, (ACK) => {
                if (ACK === "Communication success") {
                    let usermsg = `<div class="user-message-container">
    <span class="user-message">${textMessage}</span>
    </div>`;
                    textInput.value = "";
                    chatArea.insertAdjacentHTML("beforeend", usermsg);
                    updateScroll();
                } else {
                    console.log("There is a problem with either the user's message, the user's ID, or the web socket connection, here is the message:" + ACK);
                }
            })
        }
    } else {
        console.log("There is a problem with either the user's message, the user's ID, or the web socket connection");
    }
}

function updateScroll() {
    chatArea.scrollTop = chatArea.scrollHeight;
}

function checkUserOut() {
    clearInterval(chatIntervalID.closeInterval);
    clearInterval(chatIntervalID.openInterval);
    chatCover.classList.remove("hide");
    chatPopup.classList.toggle("show");
    chatCoverContentHandler("hide wait and close messages")
    ongoingChat = false;
    xcallyWebSocket != null ? xcallyWebSocket.disconnect() : null;
}

function moveSubmitUp() {
    const elem = document.getElementById("cht-wndw-sbmt");
    if (elem.style.bottom != "0px") {
        let id = null;
        let pos = -30;
        clearInterval(id);
        id = setInterval(frame, 5);
        function frame() {
            if (pos == 0) {
                clearInterval(id);
            } else {
                pos++;
                elem.style.bottom = pos + "px";
            }
        }
    }
}

function moveSubmitDown() {
    if (textInput.value?.trim() === "") {
        let id = null;
        const elem = document.getElementById("cht-wndw-sbmt");
        let pos = 0;
        clearInterval(id);
        id = setInterval(frame, 5);
        function frame() {
            if (pos == -30) {
                clearInterval(id);
            } else {
                pos--;
                elem.style.bottom = pos + "px";
            }
        }
    }
}

function chatCoverContentHandler(action) {
    switch (action) {
        case "show wait message":
            chatCover.classList.remove("hide");
            chatCoverMessageContainer.classList.remove('hide');
            chatCoverCloseMessage.classList.add('hide');
            chatCoverWaitMessage.classList.remove('hide');
            break;
        case "show close message":
            console.log("called show close message")
            chatCover.classList.remove("hide");
            chatCoverMessageContainer.classList.remove('hide');
            chatCoverCloseMessage.classList.remove('hide');
            chatCoverWaitMessage.classList.add('hide');
            break;
        case "hide wait and close messages":
            chatCover.classList.add("hide");
            chatCoverMessageContainer.classList.add('hide');
            chatCoverCloseMessage.classList.add('hide');
            chatCoverWaitMessage.classList.add('hide');
            break;
        case "show form and play video":
            chatCover.classList.remove("hide");
            chatCoverVideo.currentTime = 0;
            chatCoverMessageContainer.classList.add('hide');
            chatCoverCloseMessage.classList.add('hide');
            chatCoverWaitMessage.classList.add('hide');
            try {
            chatCoverVideo.play();                
            } catch (error) {
            console.error(error)
            }
            break;
        case "pause and reset video":
            try {
            chatCoverVideo.pause(); 
            chatCoverVideo.currentTime = 0;
            } catch (error) {
            console.error(error);
            }
            break;  
        default:
            console.log("Empty chat cover content handler call");
            break;
    }
}

function chatStarter() {
    chatCoverContentHandler("pause and reset video");
    chatCoverContentHandler("show wait message");
    serverConnect();
    userID = chatCoverListValue.textContent + chatCoverTextInput.value;
    chatIntervalID.closeInterval = setInterval(() => {
        chatCoverContentHandler("show close message");
        clearInterval(chatIntervalID.closeInterval);
        clearInterval(chatIntervalID.openInterval);
    }, 15000);
    try {
        xcallyWebSocket.emit("clientMessage", `El cliente ${userID} ha iniciado una interacción de Chat`, userID, (ACK) => {
            if (ACK === "Communication success") {
                ongoingChat = true;
                chatIntervalID.openInterval = setInterval(() => {
                    chatCoverContentHandler("hide wait and close messages");
                    chatCoverTextInput.value = "";
                    clearInterval(chatIntervalID.openInterval);
                    clearInterval(chatIntervalID.closeInterval);
                }, 2000)
                textInput.disabled = false;
                chatArea.innerHTML = "";
            } else {
                chatCoverContentHandler("show close message");
                userID = null;
            }
        })
    } catch (error) {
        console.log(error);
        chatCoverContentHandler("show close message");
    }
}

chatCoverListDropdownMenu.addEventListener('click', function (event) {
    if (event.target.classList.contains('dropdown-item')) {
        chatCoverListValue.textContent = event.target.textContent;
        chatCoverListDropdownMenu.classList.remove('show');
    }
})

window.addEventListener('click', function (event) {
    if (chatCoverListDropdownMenu.classList.contains('show')) {
        if (!chatCoverListDropdown.contains(event.target)) {
            chatCoverListDropdownMenu.classList.remove('show');
        }
    }
});

chatCoverTextInput.addEventListener('keydown', (trigger) => {
    if (chatCoverTextInput.value.trim() != "" && trigger.key === "Enter") {
        chatStarter();
    }
})

startChatButton.addEventListener("mouseover", () => {
    if (chatCoverTextInput.value.trim() === "") {
        startChatButton.classList.remove("conditional-not-opaque-not-working-button");
    } else {
        startChatButton.classList.add("conditional-not-opaque-not-working-button");
    }
})

chatCoverTextInput.addEventListener("input", () => {
    if (chatCoverTextInput.value.trim() === "") {
        startChatButton.classList.remove("conditional-not-opaque-not-working-button");
    } else {
        startChatButton.classList.add("conditional-not-opaque-not-working-button");
    }
})

startChatButton.addEventListener("click", () => {
    if (chatCoverTextInput.value.trim() != "") {
        chatStarter();
    }
})

chatCoverListToggle.addEventListener('click', function (event) {
    chatCoverListDropdownMenu.classList.toggle('show');
    event.stopPropagation();
});

minimizeChatButton.addEventListener("click", () => {
    chatPopup.classList.toggle("show");
    chatCoverContentHandler("pause and reset video")
});

openChatButton.addEventListener("click", () => {
    chatPopup.classList.toggle("show");
    ongoingChat === false ? chatCoverContentHandler("show form and play video") : null;
});

openChatButtonText.addEventListener("click", () => {
    chatPopup.classList.toggle("show");
    ongoingChat === false ? chatCoverContentHandler("show form and play video") : null;
});

closeChatButton.addEventListener("click", () => {
    chatCoverContentHandler("pause and reset video")
    checkUserOut();
});

submitButton.addEventListener("click", () => {
    let userInput = textInput.value;
    sendMsg(userInput);
    moveSubmitDown();
});

textInput.addEventListener("keydown", (trigger) => {
    if (trigger.key === "Enter") {
        let userInput = textInput.value;
        sendMsg(userInput);
        moveSubmitDown();
    }
});
