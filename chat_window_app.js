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
    chatCoverMessage = document.getElementById("chat-cover-message");

let xcallyWebSocket = null;

let userID; // this is used to identify the user on the CC server;

async function serverConnect() {
    function appendMessage(text) {
        const serverMessage = `<div class="server-message-container">
        <span class="server-message">${text}</span>
        </div>`;
        chatArea.insertAdjacentHTML("beforeend", serverMessage);
        updateScroll();
    };
    xcallyWebSocket = await io("https://cx.oltpsys.com", {
        path: "/webChat/chatSocket/"
    });
    xcallyWebSocket.on("serverMessage", (text) => {
        appendMessage(text);
    })
    xcallyWebSocket.on("disconnect", (reason) => {
        if (reason === "io server disconnect" || reason === "io client disconnect") {
            appendMessage("¡Gracias por contactarnos! Hasta luego.")
        }
    })
}

function sendMsg(textMessage) {
    let ACK = null;
    if (textMessage != undefined && userID != undefined && xcallyWebSocket != null) {
        if (textMessage.trim() != "") {
            const contactManagerIDField = "cf_4"
            xcallyWebSocket.emit("clientMessage", textMessage, userID, contactManagerIDField, (ACK) => {
                if (ACK === "Communication success") {
                    let usermsg = `<div class="user-message-container">
    <span class="user-message">${textMessage}</span>
    </div>`;
                    textInput.value = "";
                    chatArea.insertAdjacentHTML("beforeend", usermsg);
                    updateScroll();
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
    for (const classes of chatCover.classList) {
        if (classes === "hide") {
            chatCover.classList.toggle("hide");
        }
    }
    chatPopup.classList.toggle("show");
    chatCoverMessage.classList.remove('show');
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
        serverConnect().then(() => {
            const contactManagerIDField = "cf_4"
            userID = chatCoverListValue.textContent + chatCoverTextInput.value;
            try {
              xcallyWebSocket.emit("clientMessage", `El cliente ${userID} ha iniciado una interacción de Chat`, userID, contactManagerIDField, (ACK) => {
                if (ACK === "Communication success") {
                    chatCoverTextInput.value = "";
                    chatCover.classList.toggle("hide");
                    textInput.disabled = false;
                    chatArea.innerHTML = "";
                    chatCoverVideo.pause();
                    chatCoverVideo.currentTime = 0;
                } else {
                    userID = null;
                    chatCoverMessage.classList.add('show');
                }
            })  
            } catch (error){
                console.log(error);
                chatCoverMessage.classList.add('show');
            }
        }).catch((error) => {
            console.log(error);
            chatCoverMessage.classList.add('show');
        });
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
        serverConnect().then(() => {
            const contactManagerIDField = "cf_4"
            userID = chatCoverListValue.textContent + chatCoverTextInput.value;
            try {
               xcallyWebSocket.emit("clientMessage", `El cliente ${userID} ha iniciado una interacción de Chat`, userID, contactManagerIDField, (ACK) => {
                if (ACK === "Communication success") {
                    chatCoverTextInput.value = "";
                    chatCover.classList.toggle("hide");
                    textInput.disabled = false;
                    chatArea.innerHTML = "";
                    chatCoverVideo.pause();
                    chatCoverVideo.currentTime = 0;
                } else {
                    userID = null;
                    chatCoverMessage.classList.add('show');
                }
            }) 
            } catch (error){
                console.error(error);
                chatCoverMessage.classList.add('show');
            }
        }).catch((error) => {
            console.log(error);
            chatCoverMessage.classList.add('show');
        });
    }
})

chatCoverListToggle.addEventListener('click', function (event) {
    chatCoverListDropdownMenu.classList.toggle('show');
    event.stopPropagation();
});

minimizeChatButton.addEventListener("click", () => {
    chatPopup.classList.toggle("show");
    chatCoverVideo.pause();
    chatCoverVideo.currentTime = 0;
});

openChatButton.addEventListener("click", () => {
    chatPopup.classList.toggle("show");
    if (chatCoverVideo.paused) {
        chatCoverVideo.play()
            .then(() => {
                console.log('Video is now playing with sound!');
            })
            .catch(error => {
                console.error('Error attempting to play video:', error);
            });
    }
});

openChatButtonText.addEventListener("click", () => {
    chatPopup.classList.toggle("show");
});

closeChatButton.addEventListener("click", () => {
    chatCoverVideo.pause();
    chatCoverVideo.currentTime = 0;
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
