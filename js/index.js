import * as bootstrap from "bootstrap"
// Import the functions you need from the SDKs you need
import {
    getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, signInAnonymously
} from "https://www.gstatic.com/firebasejs/9.9.2/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.2/firebase-app.js";
import {
    doc, setDoc, addDoc, getDoc, getDocs, collection, query, where, limit, deleteDoc,
    getFirestore, onSnapshot, updateDoc, writeBatch, increment, arrayUnion
} from "https://www.gstatic.com/firebasejs/9.9.2/firebase-firestore.js";
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
let _gameListener = null;
let _gameUserListener = null;
let _lobbyListener = null;
let _joinLobbyReference = null;
let _joinListener = null;
let _definitionsListener = null;
let _guessessListener = null;
let _submittedListener = null;
/** @type {HTMLDivElement} */
const signInModalElement = document.querySelector("#signInModal");
const signInModal = new bootstrap.Modal(signInModalElement);
/** @type {HTMLDivElement} */
const requestAccountModalElement = document.querySelector("#requestAccountModal");
const requestAccountModal = new bootstrap.Modal(requestAccountModalElement);
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
/** @type {HTMLFormElement} */
const requestAccountForm = document.querySelector("#requestAccountForm");
/** @type {HTMLButtonElement} */
const requestAccountButton = document.querySelector("#requestAccount");
/** @type {HTMLSpanElement} */
const currentUserSpan = document.querySelector("#currentUser");
/** @type {HTMLButtonElement} */
const signOutButton = document.querySelector("#signOut");
/** @type {HTMLDivElement} */
const gameData = document.querySelector("#gameData");
/** @type {HTMLButtonElement} */
const btnJoin = document.querySelector("#btnJoin");
/** @type {HTMLFormElement} */
const definitionSubmit = document.querySelector("#definitionSubmit");
/** @type {HTMLDivElement} */
const definitions = document.querySelector("#definitions");
/** @type {HTMLOListElement} */
const definitionsList = document.querySelector("#definitionsList");
/** @type {HTMLSpanElement} */
const gameName = document.querySelector("#gameName");
/** @type {HTMLFormElement} */
const guessSubmit = document.querySelector("#guessSubmit");

function shuffle(array) {
    let currentIndex = array.length, randomIndex;

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

function isNumber(value) {
    if (typeof value == "number") {
        return true;
    } else if (typeof value == "string") {
        return value.match(/^\d+$/);
    }
    return false;
}

/**
 * 
 * @param {DocumentReference} docRef
 */
async function _deleteDoc(docRef) {
    try {
        await deleteDoc(docRef);
    } catch (error) {
        console.error(error);
    }
}

/**
 * 
 * @param {DocumentReference} docRef
 * @returns {Promise<DocumentSnapshot?>}
 */
async function _getDoc(docRef) {
    try {
        const resultDoc = await getDoc(docRef);
        return resultDoc != null && resultDoc.exists()
            ? resultDoc
            : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * 
 * @param {Query} query
 * @param {(DocumentSnapshot) => void} action
 * @returns {Promise<QuerySnapshot?>}
 */
async function _getDocs(query, action = undefined) {
    try {
        const docs = await getDocs(query);
        if (typeof action !== "undefined") {
            docs.forEach(action);
        }
        return docs;
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * 
 * @param {CollectionReference} collectionRef
 * @param {Object} data
 * @returns {Promise<DocumentReference?>}
 */
async function _addDoc(collectionRef, data) {
    try {
        return await addDoc(collectionRef, data);
    } catch (error) {
        console.log({data: data, collection: collectionRef});
        console.error(error);
        return null;
    }
}

/**
 * 
 * @param {DocumentReference} docRef
 * @param {Object} data
 */
async function _setDoc(docRef, data) {
    try {
        await setDoc(docRef, data);
    } catch (error) {
        console.error(error);
    }
}

/**
 * 
 * @param {DocumentReference} docRef
 * @param {Object} data
 */
async function _updateDoc(docRef, data) {
    try {
        await updateDoc(docRef, data);
    } catch (error) {
        console.error(error);
    }
}

/**
 * 
 * @param {DocumentReference | CollectionReference} reference
 * @param {(DocumentSnapshot) => void | Promise<void>} onNext
 * @param {(FirestoreError) => void | Promise<void>} onError
 * @param {() => void | Promise<void>} onCompletion
 * @returns {Unsubscribe?}
 */
function _onSnapshot(reference, onNext, onError = undefined, onCompletion = undefined) {
    try {
        return onSnapshot(reference, onNext, onError, onCompletion);
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * 
 * @param {WriteBatch} batch
 * @returns {Promise<boolean>}
 */
async function commitBatch(batch) {
    try {
        await batch.commit();
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}


function setJoinForm(options = {}) {
    const lobbyName = joinOptionsForm.querySelector("input[name=lobbyName]");
    if ("displayName" in options) {
        lobbyName.value = options.displayName;
        lobbyName.setAttribute("readonly", "");
    } else {
        lobbyName.value = "";
        lobbyName.removeAttribute("readonly");
    }
    const gameName = joinOptionsForm.querySelector("input[name=gameName]");
    if ("gameName" in options) {
        gameName.value = options.gameName;
        gameName.setAttribute("readonly", "");
    } else {
        gameName.value = "";
        gameName.removeAttribute("readonly");
    }
    if ("gameName" in options && "displayName" in options) {
        btnJoin.innerText = "Cancel Join Request";
    } else {
        btnJoin.innerText = "Join";
    }
}

/**
 * 
 * @param {{}} waitingOptions 
 * @returns 
 */
function setLobbyWaiting(waitingOptions = {}) {
    if (_joinLobbyReference == null) {
        setJoinForm();
        return;
    }
    setJoinForm(waitingOptions);
    _joinListener = _onSnapshot(_joinLobbyReference, async (doc) => {
        if (doc != null && doc.exists()) {
            return;
        }
        await checkUserGame(gameName);
    }, async () => {
        await checkUserGame(gameName);
    });
    if (_joinListener == null) {
        setJoinForm();
    }
}

onAuthStateChanged(auth, async (user) => {
    const wasSignedIn = typeof (currentUser) != "undefined";
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
        if (game == null) {
            const lobbyDoc = await joinLobbyDoc();
            showElement(joinOptions);
            if (lobbyDoc == null) {
                return;
            }
            setLobbyWaiting(lobbyDoc.data());
            return;
        }
        showElement(gameName);
        setListeners(game);
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
requestAccountButton.addEventListener("click", async () => {
    const formData = new FormData(requestAccountForm);
    const email = formData.get("email").trim();
    if (!email) {
        return;
    }
    try {
        await _addDoc(collection(db, "accountRequests"), {email: email, date: Date.now()});
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
    } catch (error) {
        console.error(error);
    }
});
btnJoin.addEventListener("click", async () => {
    if (_joinListener != null) {
        _joinListener();
        _joinListener = null;
        await _deleteDoc(_joinLobbyReference);
        setJoinForm();
        return;
    }
    const formData = new FormData(joinOptionsForm);
    const lobbyName = formData.get("lobbyName").trim();
    const gameName = formData.get("gameName").trim();
    if (!lobbyName || !gameName) {
        return;
    }
    const requestObject = {
        displayName: lobbyName,
        userId: currentUser.uid,
        gameName: gameName,
    };
    _joinLobbyReference = await _addDoc(collection(db, "lobby"), requestObject);
    setLobbyWaiting(requestObject);
});
definitionSubmit.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const definitionInput = definitionSubmit.querySelector("#definition");
    const value = definitionInput.value.trim();
    const invalidInput = definitionSubmit.querySelector(".invalid-feedback");
    if (invalidInput != null) {
        invalidInput.remove();
    }
    if (!value || !definitionSubmit.checkValidity()) {
        const invalidInput = document.createElement("div");
        invalidInput.classList.add("invalid-feedback");
        invalidInput.innerText = "Definition cannot be empty"
        definitionInput.parentElement.appendChild(invalidInput);
        definitionSubmit.classList.add("was-validated");
        return;
    }
    const defDoc = await _addDoc(collection(db, "definitionQueue", currentGameId, "definitions"), {
        userId: currentUser.uid,
        value: value,
    });
    if (defDoc == null) {
        console.log("error adding definitions")
    }
    hideElement(definitionSubmit);
});
guessSubmit.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const guessInput = guessSubmit.querySelector("#guess");
    const value = guessInput.value.trim();
    const invalidInput = guessSubmit.querySelectorAll(".invalid-feedback");
    Array.from(invalidInput).forEach(i => i.remove());
    if (!value) {
        const invalidInput = document.createElement("div");
        invalidInput.classList.add("invalid-feedback");
        invalidInput.innerText = "Guess must not be empty"
        guessInput.parentElement.appendChild(invalidInput);
        guessSubmit.classList.add("was-validated");
        return;
    }
    let guessNumber;
    try {
        guessNumber = Number.parseInt(value);
    } catch (ex) {
        console.error(ex);
    }
    const gameDoc = await getGame(doc(db, "games", currentGameId));
    if (guessNumber <= 0 || guessNumber > gameDoc.data().definitions.length) {
        const invalidInput = document.createElement("div");
        invalidInput.classList.add("invalid-feedback");
        invalidInput.innerText = "Guess must be a valid number"
        guessInput.parentElement.appendChild(invalidInput);
        guessSubmit.classList.add("was-validated");
        return;
    }
    const guessDoc = await _addDoc(collection(db, "guessQueue", currentGameId, "guesses"), {
        userId: currentUser.uid,
        value: Number.parseInt(value),
    });
    if (guessDoc == null) {
        console.log("error adding definitions")
    }
    hideElement(guessSubmit);
});

async function checkUserGame(gameName) {
    const gameUser = await _getDoc(doc(db, "games", gameName, "users", currentUser.uid));
    if (gameUser == null) {
        btnJoin.innerText = "Join";
        return;
    }
    hideElement(joinOptions);
    const game = await _getDoc(doc(db, "games", gameName));
    if (game == null) {
        btnJoin.innerText = "Join";
        return;
    }
    setListeners(game);
}

async function joinLobbyDoc() {
    if (currentUser == null) {
        return null;
    }
    const docQuery = query(collection(db, "lobby"), where("userId", "==", currentUser.uid));
    const lobbyDocs = await _getDocs(docQuery);
    if (lobbyDocs == null || lobbyDocs.empty) {
        return null;
    }
    const firstLobbyDoc = lobbyDocs.docs[0]
    _joinLobbyReference = firstLobbyDoc.ref;
    return firstLobbyDoc
}

async function getCurrentUser() {
    return await _getDoc(doc(db, "users", currentUser.uid));
}

async function getCurrentGame() {
    if (currentUser.isAnonymous) {
        let userDoc = await getCurrentUser();
        if (userDoc == null) {
            await _setDoc(doc(db, "users", currentUser.uid), {
                isAdmin: false,
                createGame: false,
                currentGame: null,
            });
            userDoc = await getCurrentUser();
        }
        const gameId = userDoc.data().currentGame;
        if (!gameId) {
            return null;
        }
        return await _getDoc(doc(db, "games", gameId));
    }
    const gameQuery = query(collection(db, "games"), where("ownerUID", "==", currentUser.uid), limit(1));
    const shapshot = await _getDocs(gameQuery);
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
    return await _getDoc(gameRef);
}

/**
 * 
 * @param {Map} map
 * @param {string} id
 * @param {any} value 
 */
function updateMap(map, id, value) {
    if (map.has(id)) {
        map.set(id, map.get(id) + value);
    } else {
        map.set(id, value);
    }
}

/**
 * 
 * @param {DocumentReference} gameRef
 */
async function calculateScores(gameRef) {
    const gameDoc = await _getDoc(gameRef);
    const currentWord = gameDoc.data().currentWord;
    const gameDefinitions = gameDoc.data().definitions || [];
    if (!gameDefinitions) {
        return;
    }
    const scoreMap = new Map();
    for (const def of gameDefinitions) {
        if (def.source === "Actual") {
            for (const id of def.guessedByIds) {
                updateMap(scoreMap, id, 1);
            }
            continue;
        }
        updateMap(scoreMap, def.sourceId, def.guessedByIds.filter(id => id != def.sourceId).length);
    }
    const batch = writeBatch(db);
    // console.log(scoreMap);
    for (const [key, value] of scoreMap) {
        batch.update(doc(gameRef, "users", key), {
            score: increment(value),
        })
    }
    batch.update(gameRef, {
        phase: "round-end",
        usedWords: arrayUnion(currentWord),
    });
    commitBatch(batch);
}
/**
 * 
 * @param {Array<string | object> | undefined} definitions
 */
function showDefinitions(definitions) {
    removeAllChildren(definitionsList);
    if (typeof definitions === "undefined" | definitions.length === 0) {
        return;
    }
    if (typeof definitions[0] === "string") {
        for (const d of definitions) {
            const item = document.createElement("li");
            item.classList.add("list-group-item");
            item.innerText = d;
            definitionsList.appendChild(item);
        }
        return;
    }
    for (const d of definitions) {
        const item = document.createElement("li");
        item.classList.add("list-group-item");
        const def = document.createElement("p");
        def.innerText = `Definition: ${d.definition}`;
        const guessedBy = document.createElement("p");
        guessedBy.innerText = `Guessed By: ${d.guessedBy.join(",")}`;
        const source = document.createElement("p");
        source.innerText = `Source: ${d.source}`;
        item.appendChild(def);
        item.appendChild(guessedBy);
        item.appendChild(source);
        definitionsList.appendChild(item);
    }
}

/**
 * 
 * @param {Array<string>} words 
 */
function showUsedWords(pastWords, words) {
    removeAllChildren(pastWords);
    for (const word of words) {
        const item = document.createElement("li");
        item.classList.add("list-group-item");
        item.innerText = word;
        pastWords.appendChild(item);
    }
}

/**
 * 
 * @param {boolean} isOwner 
 */
function startGameListener(game, isOwner) {
    const currentWord = gameData.querySelector("#currentWord");
    const phase = gameData.querySelector("#phase");
    const nextRound = gameData.querySelector("#btnNextRound");
    const pastWords = gameData.querySelector("#pastWords");
    removeAllChildren(pastWords);
    _gameListener = _onSnapshot(game.ref, async (doc) => {
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
                showDefinitions(data.definitions);
                hideElement(definitionSubmit);
                break;
            case "update-scores":
                if (isOwner) {
                    await calculateScores(game.ref);
                }
                break;
            case "round-end":
                hideElement(definitionSubmit);
                hideElement(guessSubmit);
                showElement(definitions);
                showDefinitions(data.definitions);
                break;
        }
        showUsedWords(pastWords, data.usedWords);
    });
    if (isOwner) {
        nextRound.addEventListener("click", async () => {
            const usedWords = (await getGame(game.ref)).data().usedWords || [];
            const words = [];
            let currentWord;
            await _getDocs(query(collection(db, "words")), (word) => {
                words.push(word.id);
            });
            for (const word of shuffle(words)) {
                if (!usedWords.includes(word)) {
                    currentWord = word;
                    break;
                }
            }
            await _updateDoc(game.ref, {
                phase: "submit-definition",
                currentWord: currentWord,
                definitions: [],
            });
        });
    }
}

function startGameUserListener(game) {
    const members = gameData.querySelector("#members");
    _gameUserListener = _onSnapshot(collection(game.ref, "users"), async (shapshot) => {
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
    });
}

async function submitDefinitionPhase(game, gameWord, batch) {
    const actualDefinition = gameWord != null
        ? (await _getDoc(doc(db, "words", gameWord))).data().definition
        : "";
    const submittedDefinitions = [];
    await _getDocs(collection(db, "definitionQueue", currentGameId, "definitions"), (defDoc) => {
        submittedDefinitions.push(defDoc.data().value.toLowerCase());
    });
    submittedDefinitions.push(actualDefinition);
    batch.update(game.ref, {
        phase: "submit-guess",
        guesses: [],
        definitions: shuffle(submittedDefinitions),
    });
}

async function submitGuessPhase(game, currentDefinitions, batch) {
    const submittedGuesses = new Map();
    await _getDocs(collection(db, "guessQueue", currentGameId, "guesses"), (guessDoc) => {
        const guessDocData = guessDoc.data();
        const guessDefinition = currentDefinitions[guessDocData.value - 1];
        const currentIds = submittedGuesses.get(guessDefinition);
        if (typeof currentIds === "undefined") {
            submittedGuesses.set(guessDefinition, [guessDocData.userId]);
        } else {
            currentIds.push(guessDocData.userId)
            submittedGuesses.set(guessDefinition, currentIds);
        }
        batch.delete(guessDoc.ref);
    });
    const definitionMap = new Map();
    await _getDocs(collection(db, "definitionQueue", currentGameId, "definitions"), (defDoc) => {
        const defDocData = defDoc.data();
        definitionMap.set(defDocData.value.toLowerCase(), defDocData.userId);
        batch.delete(defDoc.ref);
    });
    const nameMap = new Map();
    const updatedDefinitions = [];
    for (const def of currentDefinitions) {
        const defUserId = definitionMap.get(def);
        let userName = "";
        if (typeof defUserId !== "undefined") {
            if (!nameMap.has(defUserId)) {
                const defUserDoc = await _getDoc(doc(game.ref, "users", defUserId));
                nameMap.set(defUserId, defUserDoc.data().displayName)
            }
            userName = nameMap.get(defUserId);
        } else {
            userName = "Actual";
        }
        const guessedByIds = [];
        const guessedBy = [];
        for (const subGuessId of (submittedGuesses.get(def) || [])) {
            if (!nameMap.has(subGuessId)) {
                const subGuessDoc = await _getDoc(doc(game.ref, "users", subGuessId));
                nameMap.set(subGuessId, subGuessDoc.data().displayName)
            }
            guessedBy.push(nameMap.get(subGuessId));
            guessedByIds.push(subGuessId);
        }
        updatedDefinitions.push({
            definition: def,
            sourceId: defUserId || "",
            source: userName,
            guessedBy: guessedBy,
            guessedByIds: guessedByIds,
        });
    }
    batch.update(game.ref, {
        phase: "update-scores",
        definitions: updatedDefinitions,
    });
}

function startSubmittedListener(game) {
    const submittedQuery = query(collection(game.ref, "users"), where("submitted", "==", true));
    _submittedListener = _onSnapshot(submittedQuery, async (submitted) => {
        const users = await _getDocs(collection(game.ref, "users"));
        const userCount = users != null ? users.size : 0;
        if (userCount == 0 || userCount != submitted.size) {
            return;
        }
        const batch = writeBatch(db);
        users.forEach(async (gameUserDoc) => {
            batch.update(gameUserDoc.ref, {
                submitted: false,
            });
        });
        let gameDoc = await _getDoc(game.ref);
        const currentPhase = gameDoc.data().phase;
        if (currentPhase == "submit-definition") {
            const gameWord = gameDoc.data().currentWord;
            await submitDefinitionPhase(game, gameWord, batch);
        } else if (currentPhase == "submit-guess") {
            const currentDefinitions = gameDoc.data().definitions;
            await submitGuessPhase(game, currentDefinitions, batch);
        }
        await commitBatch(batch);
    });
}

function startLobbyListener(game) {
    const lobbyQuery = query(collection(db, "lobby"), where("gameName", "==", currentGameId));
    _lobbyListener = _onSnapshot(lobbyQuery, (waiting) => {
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
            addButton.addEventListener("click", async (e) => {
                e.target.setAttribute("disabled", "");
                const batch = writeBatch(db);
                batch.set(doc(game.ref, "users", data.userId), {
                    displayName: data.displayName,
                    score: 0
                });
                batch.delete(waitingDoc.ref);
                batch.update(doc(db, "users", data.userId), {
                    currentGame: currentGameId,
                });
                await commitBatch(batch);
                e.target.parentElement.remove();
            });
            item.appendChild(displayName);
            item.appendChild(addButton);
            lobby.appendChild(item);
        });
    });
}

function startDefinitionListener(game) {
    const definitionsQuery = query(collection(db, "definitionQueue", currentGameId, "definitions"));
    _definitionsListener = _onSnapshot(definitionsQuery, async (defDoc) => {
        defDoc.docChanges().forEach(async (change) => {
            if (change.type == "added") {
                const changeDocData = change.doc.data();
                await _updateDoc(doc(game.ref, "users", changeDocData.userId), {
                    submitted: true,
                });
            }
        })
    });
}

function startGuessesListener(game) {
    const guessessQuery = query(collection(db, "guessQueue", currentGameId, "guesses"));
    _guessessListener = _onSnapshot(guessessQuery, async (guessDoc) => {
        guessDoc.docChanges().forEach(async (change) => {
            if (change.type == "added") {
                const changeDocData = change.doc.data();
                await _updateDoc(doc(game.ref, "users", changeDocData.userId), {
                    submitted: true,
                });
            }
        })
    });
}

function setListeners(game) {
    currentGameId = game.id;
    gameName.innerText = currentGameId;
    const isOwner = game.data().ownerUID == currentUser.uid;
    showElement(gameData);
    const lobby = gameData.querySelector("#lobby");
    removeAllChildren(lobby);
    startGameListener(game, isOwner);
    startGameUserListener(game);
    if (isOwner) {
        showElement(gameData.querySelector("#lobbyDiv"));
        startSubmittedListener(game);
        startLobbyListener(game);
        startDefinitionListener(game);
        startGuessesListener(game);
    } else {
        hideElement(gameData.querySelector("#lobbyDiv"));
    }
}
