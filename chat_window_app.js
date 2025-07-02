// selecting html elements for manipulation in program below
let chatPopup = document.querySelector(".chat-popup"),
    openChatButton = document.querySelector(".start-button-image"),
    submitButton = document.getElementById("cht-wndw-sbmt"),
    chatArea = document.querySelector(".chat-area"),
    closeChatButton = document.querySelector(".close-button"),
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
    chatCoverTextInput = document.getElementById("chat-cover-input-text");

let userID; // this is used to identify the user on the CC server;

const contactCenterURL = "https://oltpsys.com/api/openchannel/accounts/8/notify",
      contactManagerIDField = "cf_7";  

function sendMsg(request) {
    if (request.text != undefined && userID != undefined) {
        if (request.text.trim() != "") {
            let toms = 2000; // timeout in miliseconds
            const sendBody = {
                from: userID,
                body: request.text,
                mapKey: contactManagerIDField
            };

            textInput.value = "";
            fetch(contactCenterURL, { method: "POST", body: sendBody })
                .then((response) =>
                    response.json().then((data) => {
                        console.log(data);
                        if (data.status === 200) {
                            let usermsg = `<div class="out-msg">
    <span class="my-msg">${request.text}</span>
    </div>`;

                            chatArea.insertAdjacentHTML("beforeend", usermsg);
                            updateScroll();
                        }
                    })
                )
                .catch((error) => console.log(error));
        }
    } else {
        console.log("There is a problem with either the user's message or the user's ID");
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
}

function moveSubmitLeft() {
    const elem = document.getElementById("cht-wndw-sbmt");
    if (elem.style.right != "9px") {
        let id = null;
        let pos = -27;
        clearInterval(id);
        id = setInterval(frame, 5);
        function frame() {
            if (pos == 9) {
                clearInterval(id);
            } else {
                pos++;
                elem.style.right = pos + "px";
            }
        }
    }
}

function moveSubmitRight() {
    if (textInput.value?.trim() === "") {
        let id = null;
        const elem = document.getElementById("cht-wndw-sbmt");
        let pos = 9;
        clearInterval(id);
        id = setInterval(frame, 5);
        function frame() {
            if (pos == -27) {
                clearInterval(id);
            } else {
                pos--;
                elem.style.right = pos + "px";
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

chatCoverTextInput.addEventListener("input", () => {
    if (chatCoverTextInput.value.trim() === "") {
        startChatButton.classList.remove("conditional-not-opaque-not-working-button");
    } else {
        startChatButton.classList.add("conditional-not-opaque-not-working-button");
    }
})

startChatButton.addEventListener("click", () => {
    if (chatCoverTextInput.value.trim() != "") {
        userID = chatCoverListValue.textContent + chatCoverTextInput.value;
        chatCoverTextInput.value = "";
        chatCover.classList.toggle("hide");
        textInput.disabled = false;
        chatArea.innerHTML = "";
    };
})

chatCoverListToggle.addEventListener('click', function (event) {
    chatCoverListDropdownMenu.classList.toggle('show');
    event.stopPropagation();
});

minimizeChatButton.addEventListener("click", () => {
    chatPopup.classList.toggle("show");
});

openChatButton.addEventListener("click", () => {
    chatPopup.classList.toggle("show");
});

openChatButtonText.addEventListener("click", () => {
    chatPopup.classList.toggle("show");
});

closeChatButton.addEventListener("click", () => {
    checkUserOut();
});

// triggered when pressing submit msg button
submitButton.addEventListener("click", () => {
    let userInput = textInput.value;
    const request = {
        text: userInput,
    };
    sendMsg(request);
});

/* triggered when pressing enter in the txt input bar*/
textInput.addEventListener("keypress", (trigger) => {
    if (trigger.key === "Enter") {
        let userInput = textInput.value;
        const request = {
            text: userInput,
        };
        sendMsg(request);
        moveSubmitRight();
    }
});