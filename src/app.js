const saveBtn = document.getElementById("save");
const tradesDiv = document.getElementById("trades");

function loadTrades() {
    const trades = JSON.parse(localStorage.getItem("trades") || "[]");
    tradesDiv.innerHTML = "";

    trades.forEach((t) => {
        const div = document.createElement("div");
        div.className = "trade-item";
        div.textContent = ${t.pair} | ${t.direction} | Entry: ${t.entry} | Exit: ${t.exit};
        tradesDiv.appendChild(div);
    });
}

saveBtn.addEventListener("click", () => {
    const pair = document.getElementById("pair").value;
    const direction = document.getElementById("direction").value;
    const entry = document.getElementById("entry").value;
    const exit = document.getElementById("exit").value;

    const trades = JSON.parse(localStorage.getItem("trades") || "[]");

    trades.push({ pair, direction, entry, exit });

    localStorage.setItem("trades", JSON.stringify(trades));

    loadTrades();
});

loadTrades();
