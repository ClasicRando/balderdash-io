import * as bootstrap from "bootstrap"
// Import the functions you need from the SDKs you need
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.9.2/firebase-auth.js"
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.2/firebase-app.js";
import { doc, setDoc, addDoc, getDoc, getDocs, collection, query, where, limit, deleteDoc, getFirestore, onSnapshot, updateDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/9.9.2/firebase-firestore.js";
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
let currentGameId = null;
let gameListener = null;
let gameUserListener = null;
let lobbyListener = null;
let joinLobbyReference = null;
let joinListener = null;
let definitionsListener = null;
let guessessListener = null;
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
/** @type {HTMLDivElement} */
const definitionSubmit = document.querySelector("#definitionSubmit");
/** @type {HTMLButtonElement} */
const btnDefSumbit = document.querySelector("#btnDefSumbit");
/** @type {HTMLDivElement} */
const definitions = document.querySelector("#definitions");
/** @type {HTMLOListElement} */
const definitionsList = document.querySelector("#definitionsList");
/** @type {HTMLSpanElement} */
const gameName = document.querySelector("#gameName");
/** @type {HTMLDivElement} */
const guessSubmit = document.querySelector("#guessSubmit");
/** @type {HTMLButtonElement} */
const btnGuessSumbit = document.querySelector("#btnGuessSumbit");

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
}

onAuthStateChanged(auth, async (user) => {
    const wasSignedIn = typeof(currentUser) != "undefined";
    if (wasSignedIn) {
        window.location.reload(true);
        return;
    }
    if (user) {
        currentUser = user;
        currentUserSpan.innerText = user.isAnonymous ? "Anonymous User" : user.email;
        showElement(currentUserSpan);
        showElement(signOutButton);
        hideElement(userOptions);
        const game = await getCurrentGame();
        if (game != null) {
            showElement(gameName);
            currentGameId = game.id;
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
        joinListener = onSnapshot(joinLobbyReference, async (doc) => {
            if (doc != null && doc.exists()) {
                console.log(doc);
                return;
            }
            await checkUserGame(gameName);
        }, async () => {
            await checkUserGame(gameName);
        });
    } catch (error) {
        console.error(error);
        btnJoin.innerText = "Join";
    }
});
btnDefSumbit.addEventListener("click", async () => {
    const value = definitionSubmit.querySelector("#definition").value.trim();
    if (!value) {
        console.log("Empty definition");
        return;
    }
    try {
        await addDoc(collection(db, "definitionQueue", currentGameId, "definitions"), {
            userId: currentUser.uid,
            value: value,
        });
        hideElement(definitionSubmit)
    } catch (error) {
        console.error(error);
    }
});
btnGuessSumbit.addEventListener("click", async () => {
    const value = guessSubmit.querySelector("#guess").value.trim();
    if (!value || !value.match(/^\d+$/g)) {
        console.log("Empty guess");
        return;
    }
    if (!value.match(/^\d+$/g)) {
        console.log("Guess must be a number");
        return;
    }
    try {
        await addDoc(collection(db, "guessQueue", currentGameId, "guesses"), {
            userId: currentUser.uid,
            value: Number.parseInt(value),
        });
        hideElement(guessSubmit)
    } catch (error) {
        console.error(error);
    }
});

async function checkUserGame(gameName) {
    try {
        const gameUser = await getDoc(doc(db, "games", gameName, "users", currentUser.uid));
        if (gameUser != null && gameUser.exists()) {
            hideElement(joinOptions);
            const game = await getDoc(doc(db, "games", gameName));
            setListeners(game);
        } else {
            btnJoin.innerText = "Join";
        }
    } catch (error) {
        console.log(error);
        btnJoin.innerText = "Join";
    }
}

async function getCurrentUser() {
    try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        return userDoc != null && userDoc.exists() ? userDoc : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getCurrentGame() {
    if (currentUser.isAnonymous) {
        let userDoc = await getCurrentUser();
        if (userDoc == null) {
            const docRef = await setDoc(doc(db, "users", currentUser.uid), {
                isAdmin: false,
                currentGame: null,
            });
            userDoc = await getCurrentUser();
        }
        const gameId = userDoc.data().currentGame;
        if (!gameId) {
            return null;
        }
        try {
            return await getDoc(doc(db, "games", gameId));
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

async function getGame(gameRef) {
    try {
        return await getDoc(gameRef);
    } catch (error) {
        console.error(error);
        return;
    }
}

function setListeners(game) {
    const gameId = game.id;
    gameName.innerText = gameId;
    const isOwner = game.data().ownerUID == currentUser.uid;
    showElement(gameData);
    const currentWord = gameData.querySelector("#currentWord");
    const phase = gameData.querySelector("#phase");
    const nextRound = gameData.querySelector("#btnNextRound");
    if (isOwner) {
        nextRound.addEventListener("click", async () => {
            const usedWords = (await getGame(game.ref)).data().usedWords||[];
            const words = [];
            let currentWord;
            try {
                (await getDocs(query(collection(db, "words")))).forEach((word) => {
                    words.push(word.id);
                });
            } catch (error) {
                console.error(error);
                return;
            }
            for (const word of shuffle(words)) {
                if (!usedWords.includes(word)) {
                    currentWord = word;
                    break;
                }
            }
            console.log(currentWord);
            try {
                await updateDoc(game.ref, {
                    phase: "submit-definition",
                    currentWord: currentWord,
                });
            } catch (error) {
                console.error(error);
                return;
            }
        });
    }
    const pastWords = gameData.querySelector("#pastWords");
    const members = gameData.querySelector("#members");
    const lobby = gameData.querySelector("#lobby");
    removeAllChildren(pastWords);
    removeAllChildren(lobby);
    gameListener = onSnapshot(game.ref, async (doc) => {
        const data = doc.data();
        currentWord.value = data.currentWord;
        if (isOwner && (data.phase == "round-end" || data.phase == "pre-game")) {
            showElement(nextRound);
        } else {
            hideElement(nextRound);
        }
        phase.value = data.phase;
        switch (data.phase) {
            case "pre-game":
            case "round-end":
                hideElement(definitionSubmit);
                hideElement(guessSubmit);
                hideElement(definitions);
                break;
            case "submit-definition":
                if (isOwner) {
                    hideElement(definitionSubmit);
                } else {
                    showElement(definitionSubmit);
                }
                hideElement(guessSubmit);
                hideElement(definitions);
                break;
            case "submit-guess":
                if (isOwner) {
                    hideElement(guessSubmit);
                    showElement(definitions);
                } else {
                    showElement(guessSubmit);
                    showElement(definitions);
                }
                removeAllChildren(definitionsList);
                if ("definitions" in data) {
                    for (const d of data.definitions) {
                        const item = document.createElement("li");
                        item.classList.add("list-group-item");
                        item.innerText = d;
                        definitionsList.appendChild(item);
                    }
                }
                hideElement(definitionSubmit);
                break;
        }
        removeAllChildren(pastWords);
        for (const word of data.usedWords) {
            const item = document.createElement("li");
            item.classList.add("list-group-item");
            item.innerText = word;
            pastWords.appendChild(item);
        }
    });
    gameUserListener = onSnapshot(collection(game.ref, "users"), async (shapshot) => {
        removeAllChildren(members);
        let submitCount = 0;
        shapshot.forEach((gameUserDoc) => {
            const user = gameUserDoc.data();
            if (user.submitted) {
                submitCount++;
            }
            const item = document.createElement("li");
            item.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-start");
            if (gameUserDoc.id == currentUser.uid) {
                item.classList.add("bg-success");
            }
            const displayName = document.createElement("div");
            displayName.classList.add("me-auto");
            displayName.innerText = user.displayName;
            const submitted = document.createElement("i");
            submitted.classList.add("fa-solid", "m-1", user.submitted ? "fa-check" : "fa-x");
            const score = document.createElement("span");
            score.classList.add("badge", "bg-primary", "rounded-pill");
            score.innerText = user.score;
            item.appendChild(displayName);
            item.appendChild(submitted);
            item.appendChild(score);
            members.appendChild(item);
        });
        if (shapshot.size === submitCount && isOwner) {
            shapshot.forEach(async (gameUserDoc) => {
                await updateDoc(gameUserDoc.ref, {
                    submitted: false,
                });
            });
            let gameDoc;
            try {
                gameDoc = await getDoc(game.ref);
            } catch (error) {
                console.error(error);
                return;
            }
            const currentPhase = gameDoc.data().phase;
            const currentWord = gameDoc.data().currentWord;
            const currentDefinitions = gameDoc.data().definitions||[];
            if (currentPhase == "submit-definition") {
                const submittedDefinitions = [];
                (await getDocs(collection(db, "definitionQueue", currentGameId, "definitions"))).forEach((defDoc) => {
                    submittedDefinitions.push(defDoc.data().value.toLowerCase());
                });
                const actualDefinition = await getDoc(doc(db, "words", currentWord));
                submittedDefinitions.push(actualDefinition.data().definition);
                try {
                    await updateDoc(game.ref, {
                        phase: "submit-guess",
                        guesses: [],
                        definitions: shuffle(submittedDefinitions),
                    });
                } catch (error) {
                    console.error(error);
                    return;
                }
            } else if (currentPhase == "submit-guess") {
                const submittedGuesses = [];
                const guessDocs = await getDocs(collection(db, "guessQueue", currentGameId, "guesses"));
                for (const guessDoc of guessDocs.docs) {
                    submittedGuesses.push(guessDoc.data());
                    await deleteDoc(guessDoc.ref);
                }
                const definitionMap = new Map();
                const scoreMap = new Map();
                const definitionDocs = await getDocs(collection(db, "definitionQueue", currentGameId, "definitions"));
                for (const defDoc of definitionDocs.docs) {
                    const defDocData = defDoc.data();
                    definitionMap.set(defDocData.value, defDocData.userId);
                    scoreMap.set(defDocData.userId, 0);
                    await deleteDoc(defDoc.ref);
                }
                for (const sg of submittedGuesses) {
                    const guess = currentDefinitions[sg.value - 1];
                    const defUser = definitionMap.get(guess);
                    if (typeof defUser !== "undefined") {
                        scoreMap.set(defUser, scoreMap.get(defUser) + 1);
                    } else {
                        scoreMap.set(sg.userId, scoreMap.get(sg.userId) + 1)
                    }
                }
                try {
                    await updateDoc(game.ref, {
                        phase: "round-end",
                        definitions: [],
                        usedWords: arrayUnion(currentWord),
                        currentWord: null,
                    });
                } catch (error) {
                    console.error(error);
                    return;
                }
                for (const gameUserDoc of shapshot.docs) {
                    const newScore = scoreMap.get(gameUserDoc.id);
                    if (typeof newScore !== "undefined") {
                        await updateDoc(gameUserDoc.ref, {
                            submitted: false,
                            score: increment(newScore),
                        });
                    }
                };
            }
        }
    });
    if (isOwner) {
        showElement(gameData.querySelector("#lobbyDiv"));
        const lobbyQuery = query(collection(db, "lobby"), where("gameName", "==", gameId));
        lobbyListener = onSnapshot(lobbyQuery, (waiting) => {
            removeAllChildren(lobby);
            waiting.forEach((waitingDoc) => {
                const data = waitingDoc.data();
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
                        await setDoc(doc(game.ref, "users", data.userId), {
                            displayName: data.displayName,
                            score: 0
                        });
                    } catch (error) {
                        console.error(error);
                        return;
                    }
                    try {
                        await deleteDoc(waitingDoc.ref);
                    } catch (error) {
                        console.error(error);
                        return;
                    }
                    try {
                        await updateDoc(doc(db, "users", data.userId), {
                            currentGame: gameId,
                        });
                    } catch (error) {
                        console.error(error);
                        return;
                    }
                });
                item.appendChild(displayName);
                item.appendChild(addButton);
                lobby.appendChild(item);
            });
        });
        const definitionsQuery = query(collection(db, "definitionQueue", gameId, "definitions"));
        definitionsListener = onSnapshot(definitionsQuery, async (defDoc) => {
            defDoc.docChanges().forEach(async (change) => {
                if (change.type == "added") {
                    const changeDocData = change.doc.data();
                    try {
                        await updateDoc(doc(db, "games", gameId, "users", changeDocData.userId), {
                            submitted: true,
                        });
                    } catch (error) {
                        console.error(error);
                        return;
                    }
                }
            })
        });
        const guessessQuery = query(collection(db, "guessQueue", gameId, "guesses"));
        guessessListener = onSnapshot(guessessQuery, async (guessDoc) => {
            guessDoc.docChanges().forEach(async (change) => {
                if (change.type == "added") {
                    const changeDocData = change.doc.data();
                    try {
                        await updateDoc(doc(db, "games", gameId, "users", changeDocData.userId), {
                            submitted: true,
                        });
                    } catch (error) {
                        console.error(error);
                        return;
                    }
                }
            })
        });
    } else {
        hideElement(gameData.querySelector("#lobbyDiv"));
    }
}
