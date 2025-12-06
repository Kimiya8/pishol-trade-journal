// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Import Firebase config
import { firebaseConfig } from "./firebase/config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const form = document.getElementById("trade-form");
const tableBody = document.querySelector("#trades-table tbody");

// Load trades on page load
document.addEventListener("DOMContentLoaded", loadTrades);

// Save new trade
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const trade = {
        pair: document.getElementById("pair").value,
        type: document.getElementById("type").value,
        result: document.getElementById("result").value,
        rr: document.getElementById("rr").value,
        comment: document.getElementById("comment").value,
        timestamp: Date.now()
    };

    try {
        await addDoc(collection(db, "trades"), trade);
        alert("Trade saved!");
        form.reset();
        loadTrades();
    } catch (err) {
        console.error("Error saving trade:", err);
        alert("Error saving trade.");
    }
});

// Load trades from Firestore
async function loadTrades() {
    tableBody.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "trades"));
        querySnapshot.forEach((doc) => {
            const t = doc.data();

            const row = 
                <tr>
                    <td>${t.pair}</td>
                    <td>${t.type}</td>
                    <td>${t.result}</td>
                    <td>${t.rr}</td>
                    <td>${t.comment}</td>
                </tr>
            ;
            tableBody.innerHTML += row;
        });
    } catch (err) {
        console.error("Error loading trades:", err);
    }
}
