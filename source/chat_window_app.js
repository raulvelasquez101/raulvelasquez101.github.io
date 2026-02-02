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
let currentIdForChatButtons = 1;
let previousEstablishedConversationSocketId = null;

function serverConnect() {
    function appendMessage(text) {
        if (Array.isArray(text)) {
            text.forEach(message => {
                const serverMessage = `<div class="server-message-container">
        <span class="server-message">${message}</span>
        </div>`;
                chatArea.insertAdjacentHTML("beforeend", serverMessage);
                updateScroll();
            })
        } else {
            const serverMessage = `<div class="server-message-container">
        <span class="server-message">${text}</span>
        </div>`;
            chatArea.insertAdjacentHTML("beforeend", serverMessage);
            updateScroll();
        }
    };
    function messageTypeManager(messageObject) {
        if (messageObject.type === "text") {
            appendMessage(messageObject.elements)
            return;
        }
        if (messageObject.type === "buttonGroup") {
            buildNChoiceMenu(messageObject.elements.buttons, messageObject.disableTextInput || false);
            return;
        }
        if (messageObject.type === "image") {
            console.log("Received the following image from backend: " + messageObject.elements);
            let insertedImage = insertImageInChat(messageObject.elements);
            insertedImage.addEventListener('click', () => {
                let url = messageObject.elements;
                const newWindow = window.open(url, '_blank');
                newWindow.opener = null;
            });
            insertedImage.addEventListener('load', () => {
                updateScroll();
            })
        }
        if (messageObject.type === "list") {
            console.log("Received list from backend: " + messageObject.elements);
            insertListInChat(messageObject.elements.bulletpoints, messageObject.elements.title);
        }
    }
    function buildNChoiceMenu(buttonTextArray, disableTextInput, noIdButtonToggle) {
        const buttonGroupContainer = document.createElement('div');
        buttonGroupContainer.className = 'contenedor-menu-N-botones';
        if (noIdButtonToggle !== true) {
            buttonGroupContainer.id = `chat-menu-${currentIdForChatButtons}`;
        }
        buttonTextArray.forEach(buttonObject => {
            const buttonDiv = document.createElement('div');
            buttonDiv.className = 'contenedor-boton button-parent';
            if (buttonObject.icon !== undefined) {
                buttonDiv.insertAdjacentHTML('beforeend', buttonObject.icon);
            }
            const textSpan = document.createElement('span');
            textSpan.className = 'texto-botones button-root';
            textSpan.textContent = buttonObject.text;
            if (buttonObject.hiddenText !== undefined) {
                const hiddenSpan = document.createElement('span');
                hiddenSpan.className = 'texto-oculto';
                hiddenSpan.textContent = buttonObject.hiddenText;
                textSpan.appendChild(hiddenSpan);
            }
            if (buttonObject.hiddenLink !== undefined) {
                console.log("Link in button object, detected: " + buttonObject.hiddenLink);
                const hiddenSpan = document.createElement('span');
                hiddenSpan.className = 'link-oculto';
                hiddenSpan.textContent = buttonObject.hiddenLink;
                textSpan.appendChild(hiddenSpan);
            }
            if (buttonObject.action !== undefined) {
                console.log("Action in button object, detected: " + buttonObject.action);
                const hiddenSpan = document.createElement('span');
                hiddenSpan.className = 'accion';
                hiddenSpan.textContent = buttonObject.action;
                textSpan.appendChild(hiddenSpan);
            }
            if (buttonObject.messageCount !== undefined) {
                console.log("Message count in button object, detected: " + buttonObject.messageCount);
                const hiddenSpan = document.createElement('span');
                hiddenSpan.className = 'contador-mensajes';
                hiddenSpan.textContent = buttonObject.messageCount;
                textSpan.appendChild(hiddenSpan);
            }
            buttonDiv.appendChild(textSpan);
            buttonGroupContainer.appendChild(buttonDiv);
        })
        chatArea.appendChild(buttonGroupContainer);
        updateScroll();
        if (disableTextInput) {
            makeDisabledTextInput(true);
        }
    }
    xcallyWebSocket = io("https://cx.oltpsys.com", {
        path: "/webChat/chatSocket/",
        timeout: 2000,
        reconnectionAttempts: 5
    });
    xcallyWebSocket.io.on('reconnect', () => {
        xcallyWebSocket.emit("configurationAfterRecconnection", userID, previousEstablishedConversationSocketId, (ACK) => {
            if (ACK !== "Succesful state transfer to new socket") {
                console.log(ACK);
                location.reload();
            }
        })
    })
    xcallyWebSocket.on("serverMessage", (text, multipleMessagesSignal, callback) => {
        if (multipleMessagesSignal === "complex") {
            text.forEach(message => {
                messageTypeManager(message);
            });
            callback();
        } else {
            appendMessage(text);
            callback();
        }
    })
    xcallyWebSocket.io.on("reconnect_failed", () => {
        appendMessage("¡Gracias por contactarnos! Hasta luego.");
        setTimeout(() => {
            checkUserOut();
        }, 3000)
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
    xcallyWebSocket.on("clean shutdown", (message, multipleMessagesSignal) => {
        if (multipleMessagesSignal === "complex") {
            message.forEach(bubble => {
                messageTypeManager(bubble);
            });
        }
        else {
            appendMessage(message);
        }
        const tempTimeout = setTimeout(() => {
            checkUserOut(tempTimeout);
        }, 3000)
    })
    xcallyWebSocket.on("messageAndNButtons", (messages, buttonTextArray, disableTextInput, noIdButtonToggle) => {
        messages.forEach((messageObject) => {
            if (typeof messageObject === "string") {
                console.log("messageAndNButtons event received an array of <Object Strings>")
                let parsedMessageObject = JSON.parse(messageObject);
                messageTypeManager(parsedMessageObject);
            }
            messageTypeManager(messageObject);
        })
        try {
            console.log("The buttons text array is...")
            console.log(buttonTextArray);
            buildNChoiceMenu(buttonTextArray, disableTextInput, noIdButtonToggle);
        } catch (error) {
            console.log("Error when creating an N choice menu.");
            console.error(error.message);
        }
    })
    xcallyWebSocket.on("getTypeOfPerson", () => {
        const naturalsArray = ["V", "E"];
        const corporatesArray = ["R", "J", "G", "C"];
        const typeOfPerson = userID[0];
        if (!corporatesArray.includes(typeOfPerson) && !naturalsArray.includes(typeOfPerson)) {
            console.log("There is some problem with the literal character in the user's ID");
        }
        if (naturalsArray.includes(typeOfPerson)) {
            xcallyWebSocket.emit("clientMessage", "Persona natural", userID, (ACK) => {
                if (ACK != "Communication success") {
                    console.log("There is a problem with either the user's message, the user's ID, or the web socket connection, here is the message:" + ACK);
                }
            });
        }
        if (corporatesArray.includes(typeOfPerson)) {
            xcallyWebSocket.emit("clientMessage", "Persona jurídica", userID, (ACK) => {
                if (ACK != "Communication success") {
                    console.log("There is a problem with either the user's message, the user's ID, or the web socket connection, here is the message:" + ACK);
                }
            });
        }
    })
    xcallyWebSocket.on('serverImage', (buffer, contentType, callback) => {
        const blob = new Blob([buffer], { type: contentType });
        const imageURL = URL.createObjectURL(blob);
        let insertedImage = insertImageInChat(imageURL);
        insertedImage.addEventListener('click', () => {
            const newWindow = window.open(imageURL, '_blank');
            newWindow.opener = null;
        });
        insertedImage.addEventListener('load', () => {
            updateScroll();
        })
        callback();
    })
}

function insertListInChat(listBulletpoints, listTitle) {
    const listContainer = document.createElement('div');
    listContainer.className = 'list-in-chat';
    const titleElement = document.createElement('h3');
    titleElement.className = "list-header";
    const strongTitle = document.createElement('span');
    strongTitle.textContent = listTitle;
    titleElement.appendChild(strongTitle);
    listContainer.appendChild(titleElement);
    const ulElement = document.createElement('ul');
    ulElement.className = "proper-list";
    listBulletpoints.forEach(pointText => {
        const liElement = document.createElement('li');
        liElement.textContent = pointText;
        liElement.className = "list-item";
        ulElement.appendChild(liElement);
    });
    listContainer.appendChild(ulElement);
    chatArea.appendChild(listContainer);
}

function insertImageInChat(image, sourceType) {
    let insertion;
    switch (sourceType) {
        default:
            insertion = document.createElement('img');
            insertion.src = image;
            insertion.className = "image-in-chat"
            chatArea.appendChild(insertion);
            updateScroll();
            break;
    }
    return insertion;
}

function makeDisabledTextInput(disable) {
    if (disable) {
        textInput.disabled = true;
        textInput.placeholder = ""
        textInput.classList.add("make-opaque");
    } else {
        textInput.disabled = false;
        textInput.placeholder = "Escribe tu pregunta"
        textInput.classList.remove("make-opaque");
    }
}

function sendMsg(textMessage, silentMode, buttonMode) {
    return new Promise((resolve, reject) => {
        if (textMessage != undefined && userID != undefined && xcallyWebSocket != null) {
            if (textMessage.trim() != "") {
                xcallyWebSocket.emit("clientMessage", textMessage, userID, (ACK) => {
                    if (ACK === "Communication success") {
                        if (!silentMode) {
                            let usermsg = `<div class="user-message-container">
                                                <span class="user-message">${textMessage}</span>
                                            </div>`;
                            textInput.value = "";
                            chatArea.insertAdjacentHTML("beforeend", usermsg);
                            updateScroll();
                        };
                        if (buttonMode) {
                            resolve("Button sent message succesfully");
                        };

                    } else {
                        console.log("There is a problem with either the user's message, the user's ID, or the web socket connection, here is the message:" + ACK);
                        resolve("Button did not send message succesfully");
                    }
                })
            }
        } else {
            console.log("There is a problem with either the user's message, the user's ID, or the web socket connection");
            resolve("Button did not send message succesfully");
        }
    })

}

function updateScroll() {
    chatArea.scrollTop = chatArea.scrollHeight;
}

function checkUserOut(tempTimeoutOrInterval) {
    clearTimeout(tempTimeoutOrInterval);
    clearInterval(tempTimeoutOrInterval);
    clearInterval(chatIntervalID.closeInterval);
    clearInterval(chatIntervalID.openInterval);
    chatCover.classList.remove("hide");
    chatPopup.classList.remove("show");
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
    userID = chatCoverListValue.textContent.trim() + chatCoverTextInput.value.trim();
    chatIntervalID.closeInterval = setInterval(() => {
        chatCoverContentHandler("show close message");
        clearInterval(chatIntervalID.closeInterval);
        clearInterval(chatIntervalID.openInterval);
    }, 15000);
    try {
        xcallyWebSocket.emit("startChat", `El cliente ${userID} ha iniciado una interacción de Chat`, userID, (ACK) => {
            if (ACK === "Communication success") {
                previousEstablishedConversationSocketId = xcallyWebSocket.id;
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
    let allowedChars = /^\d+$/;
    if (chatCoverTextInput.value.trim() != "" && trigger.key === "Enter" && allowedChars.test(chatCoverTextInput.value)) {
        chatStarter();
    }
})

startChatButton.addEventListener("mouseover", () => {
    let allowedChars = /^\d+$/;
    if (chatCoverTextInput.value.trim() === "" || !allowedChars.test(chatCoverTextInput.value)) {
        startChatButton.classList.remove("conditional-not-opaque-not-working-button");
    } else {
        startChatButton.classList.add("conditional-not-opaque-not-working-button");
    }
})

chatCoverTextInput.addEventListener("input", () => {
    let allowedChars = /^\d+$/;
    if (chatCoverTextInput.value.trim() === "" || !allowedChars.test(chatCoverTextInput.value)) {
        startChatButton.classList.remove("conditional-not-opaque-not-working-button");
    } else {
        startChatButton.classList.add("conditional-not-opaque-not-working-button");
    }
})

startChatButton.addEventListener("click", () => {
    let allowedChars = /^\d+$/;
    if (chatCoverTextInput.value.trim() != "" && allowedChars.test(chatCoverTextInput.value)) {
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

textInput.addEventListener("input", function (event) {
    const forbiddenCharsRegex = /[^ \p{L}\p{N}\s.,¿¡!?'"-]/ug;
    const start = this.selectionStart;
    const end = this.selectionEnd;
    this.value = this.value.replace(forbiddenCharsRegex, '');
    this.setSelectionRange(start, end);
});

textInput.addEventListener("keydown", (trigger) => {
    if (trigger.key === "Enter") {
        let userInput = textInput.value;
        sendMsg(userInput);
        moveSubmitDown();
    }
});

chatArea.addEventListener("click", async function (trigger) {
    async function buttonActionManager(actualButton) {
        const hiddenText = actualButton.querySelector(".texto-oculto");
        if (hiddenText) {
            return await sendMsg(hiddenText.textContent.trim(), "silentMode", "buttonMode");
        }
        const hiddenLink = actualButton.querySelector(".link-oculto");
        if (hiddenLink) {
            try {
                let url = hiddenLink.textContent.trim();
                const newWindow = window.open(url, '_blank');
                newWindow.opener = null;
                return "Link opened succesfully";
            } catch (error) {
                console.error(error.message);
                return "Error when opening " + hiddenLink.textContent.trim();
            }
        }
        const action = actualButton.querySelector(".accion");
        if (action) {
            try {
                const actionType = action.textContent.trim();
                if (actionType === "continue") {
                    return await new Promise((resolve) => {
                        xcallyWebSocket.emit("refreshSession", userID, (ACK) => {
                            if (ACK === "Succesful socket refresh") {
                                const count = parseInt(actualButton.querySelector(".contador-mensajes").textContent.trim());
                                for (let i = 0; i < count; i++) {
                                    chatArea.lastChild.remove();
                                }
                                resolve("Continue performed succesfully");
                            } else {
                                resolve("Error when performing continue");
                            }
                        });
                    });
                } else {
                    return "Action " + actionType + " not found";
                }
            } catch (error) {
                console.error(error.message);
                return "Error when performing " + action.textContent.trim();
            }
        }
        return await sendMsg(actualButton.textContent.trim(), "silentMode", "buttonMode");

    }
    let clickedElement = trigger.target;
    const possibleClasses = ["texto-botones", "contenedor-boton"];
    const clickedClassesArray = Array.from(clickedElement.classList);
    const isChatButton = possibleClasses.some(validClass => clickedClassesArray.includes(validClass));
    const buttonGroupContainer = clickedElement.closest('[id^="chat-menu-"]');
    if (buttonGroupContainer) {
        const containerIdNumber = parseInt(buttonGroupContainer.id.split('-').pop());
        if (containerIdNumber !== currentIdForChatButtons) {
            return;
        }
    }
    if (isChatButton) {
        let buttonUseFlag = "";
        switch (true) {
            case clickedClassesArray.includes("button-root"): {
                buttonUseFlag = await buttonActionManager(clickedElement);
                break;
            }
            case clickedClassesArray.includes("button-parent"): {
                const textSpan = clickedElement.querySelector(".texto-botones");
                if (textSpan) {
                    buttonUseFlag = await buttonActionManager(textSpan);
                } else {
                    console.log("Parent clicked, but inner text span (.texto-botones) not found.");
                }
                break;
            }
            default:
                break;
        }
        if (buttonUseFlag === "Button sent message succesfully") {
            buttonGroupContainer.classList.add('make-opaque');
            makeDisabledTextInput(false);
            currentIdForChatButtons++;
        }
    }
});

textInput.addEventListener("focus", moveSubmitUp);
textInput.addEventListener("blur", moveSubmitDown);