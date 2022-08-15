import * as bootstrap from "bootstrap"
// Import the functions you need from the SDKs you need
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.9.2/firebase-auth.js"
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.2/firebase-app.js";
import { doc, setDoc, addDoc, getDoc, getDocs, updateDoc, collection, query, where, limit, deleteDoc, getFirestore, onSnapshot } from "https://www.gstatic.com/firebasejs/9.9.2/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD8tJ7Qgq_Bs4PPYLHmXdKM9Pvz-51Ns6Y",
    authDomain: "baldersash-9741d.firebaseapp.com",
    projectId: "baldersash-9741d",
    storageBucket: "baldersash-9741d.appspot.com",
    messagingSenderId: "633342197140",
    appId: "1:633342197140:web:03fc0330c71dd8a0efa381"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser;
let gameListener = null;
let lobbyListener = null;
let joinLobbyReference = null;
let joinListener = null;
/** @type {HTMLDivElement} */
const signInModalElement = document.querySelector("#signInModal");
const signInModal = new bootstrap.Modal(signInModalElement);
/** @type {HTMLButtonElement} */
const btnPlayAnonymously = document.querySelector("#btnPlayAnonymously");
/** @type {HTMLDivElement} */
const userOptions = document.querySelector("#userOptions")
/** @type {HTMLDivElement} */
const joinOptions = document.querySelector("#joinOptions");
/** @type {HTMLFormElement} */
const joinOptionsForm = joinOptions.querySelector("form");
/** @type {HTMLFormElement} */
const signInForm = document.querySelector("#signInForm");
/** @type {HTMLButtonElement} */
const signInButton = document.querySelector("#signIn");
/** @type {HTMLSpanElement} */
const currentUserSpan = document.querySelector("#currentUser");
/** @type {HTMLButtonElement} */
const signOutButton = document.querySelector("#signOut");
/** @type {HTMLDivElement} */
const gameData = document.querySelector("#gameData");
/** @type {HTMLButtonElement} */
const btnJoin = document.querySelector("#btnJoin");

onAuthStateChanged(auth, async (user) => {
    const wasSignedIn = typeof(currentUser) != "undefined";
    if (wasSignedIn) {
        window.location.reload(true);
        return;
    }
    if (user) {
        currentUser = user;
        if (!currentUserExists()) {
            await setDoc(doc(db, "users", currentUser.uid), {
                isAdmin: false,
                currentGame: null,
            });
        }
        currentUserSpan.innerText = user.isAnonymous ? "Anonymous User" : user.email;
        showElement(currentUserSpan);
        showElement(signOutButton);
        hideElement(userOptions);
        const game = await getCurrentGame();
        if (game != null) {
            setListeners(game);
        } else {
            showElement(joinOptions);
        }
    } else {
        showElement(userOptions);
    }
});
signInButton.addEventListener("click", async () => {
    const formData = new FormData(signInForm);
    const email = formData.get("email").trim();
    const password = formData.get("password").trim();
    if (!email || !password) {
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
        signInModal.hide();
    } catch (error) {
        console.error(error);
    }
});
btnPlayAnonymously.addEventListener("click", async () => {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        console.error(error);
    }
});
signOutButton.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.reload(true);
    } catch (error) {
        console.error(error);
    }
});
btnJoin.addEventListener("click", async () => {
    if (joinListener != null) {
        joinListener();
        joinListener = null;
        try {
            await deleteDoc(joinLobbyReference);
        } catch (error) {
            console.error(error);
        }
        btnJoin.innerText = "Join";
        return;
    }
    const formData = new FormData(joinOptionsForm);
    const lobbyName = formData.get("lobbyName").trim();
    const gameName = formData.get("gameName").trim();
    if (!lobbyName || !gameName) {
        return;
    }
    btnJoin.innerText = "Cancel";
    try {
        joinLobbyReference = await addDoc(collection(db, "lobby"), {
            displayName: lobbyName,
            userId: currentUser.uid,
            gameName: gameName,
        });
    } catch (error) {
        console.error(error);
        btnJoin.innerText = "Join";
    }
    try {
        joinListener = onSnapshot(joinLobbyReference, (doc) => {
            if (doc == null) {
                window.location.reload();
            } else {
                console.log(doc);
            }
        });
    } catch (error) {
        console.error(error);
        btnJoin.innerText = "Join";
    }
});

async function currentUserExists() {
    try {
        userDoc = await getDoc(doc(db, "users", currentUser.uid));
        return userDoc != null && userDoc.exists();
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function getCurrentGame() {
    if (currentUser.isAnonymous) {
        let userDoc;
        try {
            userDoc = await getDoc(doc(db, "users", currentUser.uid));
        } catch (error) {
            console.error(error);
            return null;
        }
        const gameRef = userDoc.data().currentGame;
        if (!gameRef) {
            return null;
        }
        try {
            return await getDoc(gameRef);
        } catch (error) {
            console.error(error);
            return null;
        }
    }
    const gameQuery = query(collection(db, "games"), where("ownerUID", "==", currentUser.uid), limit(1));
    const shapshot = await getDocs(gameQuery);
    return shapshot.size > 0 ? shapshot.docs[0] : null;
}

/**
 * 
 * @param {HTMLElement} element 
 */
function showElement(element) {
    element.classList.remove("d-none");
}

/**
 * 
 * @param {HTMLElement} element 
 */
function hideElement(element) {
    element.classList.add("d-none");
}

/**
 * 
 * @param {HTMLElement} element 
 */
function removeAllChildren(element) {
    while (element.firstChild != null) {
        element.removeChild(element.firstChild);
    }
}

function setListeners(game) {
    const gameId = game.id;
    const isOwner = game.data().ownerUID == currentUser.uid;
    showElement(gameData);
    const currentWord = gameData.querySelector("#currentWord");
    const phase = gameData.querySelector("#phase");
    const pastWords = gameData.querySelector("#pastWords");
    const members = gameData.querySelector("#members");
    const lobby = gameData.querySelector("#lobby");
    removeAllChildren(pastWords);
    removeAllChildren(members);
    removeAllChildren(lobby);
    gameListener = onSnapshot(game.ref, (doc) => {
        const data = doc.data();
        currentWord.value = data.currentWord;
        phase.value = data.phase;
        removeAllChildren(pastWords);
        for (const word of data.usedWords) {
            const item = document.createElement("li");
            item.classList.add("list-group-item");
            item.innerText = word;
            pastWords.appendChild(item);
        }
        removeAllChildren(members);
        for (const user of Object.values(data.users)) {
            const item = document.createElement("li");
            item.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-start");
            const displayName = document.createElement("div");
            displayName.classList.add("me-auto");
            displayName.innerText = user.displayName;
            const score = document.createElement("span");
            score.classList.add("badge", "bg-primary", "rounded-pill");
            score.innerText = user.score;
            item.appendChild(displayName);
            item.appendChild(score);
            members.appendChild(item);
        }
        console.log("Current Data: ", data);
    });
    if (isOwner) {
        showElement(gameData.querySelector("#lobbyDiv"));
        const lobbyQuery = query(collection(db, "lobby"), where("gameName", "==", gameId));
        lobbyListener = onSnapshot(lobbyQuery, (waiting) => {
            removeAllChildren(lobby);
            waiting.forEach((doc) => {
                const data = doc.data();
                const item = document.createElement("li");
                item.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-start");
                const displayName = document.createElement("div");
                displayName.classList.add("me-auto");
                displayName.innerText = data.displayName;
                const add = document.createElement("i");
                add.classList.add("fa-solid", "fa-plus");
                const addButton = document.createElement("button");
                addButton.classList.add("btn", "btn-primary", "rounded");
                addButton.appendChild(add);
                addButton.addEventListener("click", async () => {
                    try {
                        const gameDoc = getDoc(game.ref);
                        const users = gameDoc.data().users;
                        users[data.userId] = {
                            displayName: data.displayName,
                            score: 0
                        };
                        await updateDoc(game.ref, {
                            users: users,
                        });
                    } catch (error) {
                        console.error(error);
                        return;
                    }
                    try {
                        await deleteDoc(doc.ref);
                    } catch (error) {
                        console.error(error);
                        return;
                    }
                });
                item.appendChild(displayName);
                item.appendChild(addButton);
                lobby.appendChild(item);
            });
        })
    } else {
        hideElement(gameData.querySelector("#lobbyDiv"));
    }
}
