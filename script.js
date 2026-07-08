const STORAGE_KEY = "debtTrackerState";

const initialDebts = [
    { id: "mkb", name: "МКБ", amount: 130000, rate: 59, deadline: "31 июля" },
    { id: "sber", name: "Сбер", amount: 70000, rate: 0, deadline: "31 августа" },
    { id: "credit62", name: "Кредит 62%", amount: 20000, rate: 62 },
    { id: "credit59", name: "Кредит 59%", amount: 20000, rate: 59 }
];

const originalTotal = initialDebts.reduce((sum, d) => sum + d.amount, 0);

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Ошибка чтения сохранённых данных", e);
        }
    }
    return {
        debts: initialDebts.map(d => ({ ...d })),
        payments: []
    };
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
let currentDebtId = null;

function formatMoney(value) {
    return Math.round(value).toLocaleString("ru-RU") + " ₽";
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("ru-RU");
}

function render() {
    const container = document.getElementById("debtsContainer");
    container.innerHTML = "";

    const remainingTotal = state.debts.reduce((sum, d) => sum + d.amount, 0);
    const paidTotal = originalTotal - remainingTotal;
    const progressPercent = originalTotal > 0 ? Math.round((paidTotal / originalTotal) * 100) : 0;

    document.getElementById("totalDebt").textContent = formatMoney(originalTotal);
    document.getElementById("paidDebt").textContent = formatMoney(paidTotal);
    document.getElementById("remainingDebt").textContent = formatMoney(remainingTotal);
    document.getElementById("progressFill").style.width = progressPercent + "%";

    const activeDebts = state.debts.filter(d => d.amount > 0);
    const goal = activeDebts[0];

    if (goal) {
        document.getElementById("goalName").textContent = goal.name;
        document.getElementById("goalText").textContent =
            `Осталось погасить ${formatMoney(goal.amount)}${goal.deadline ? " до " + goal.deadline : ""}`;
    } else {
        document.getElementById("goalName").textContent = "🎉 Все долги закрыты!";
        document.getElementById("goalText").textContent = "Ты справилась. Свобода достигнута!";
    }

    state.debts.forEach(debt => {
        const card = document.createElement("div");
        card.className = "debt-card" + (debt.amount <= 0 ? " closed" : "");
        card.innerHTML = `
            <h3>${debt.name} ${debt.amount <= 0 ? "✅" : ""}</h3>
            <p><strong>Остаток:</strong> ${formatMoney(debt.amount)}</p>
            <p><strong>Ставка:</strong> ${debt.rate}%</p>
            ${debt.amount > 0
                ? `<button class="pay-btn" onclick="openPayModal('${debt.id}')">💸 Внести платеж</button>`
                : `<p class="closed-label">Долг закрыт</p>`}
        `;
        container.appendChild(card);
    });

    renderHistory();
}

function renderHistory() {
    const historyContainer = document.getElementById("historyContainer");
    const undoBtn = document.getElementById("undoBtn");

    if (state.payments.length === 0) {
        historyContainer.innerHTML = `<p class="empty-text">Платежей пока нет</p>`;
        undoBtn.classList.add("hidden");
        return;
    }

    undoBtn.classList.remove("hidden");
    historyContainer.innerHTML = state.payments
        .slice()
        .reverse()
        .map(p => `
            <div class="history-item">
                <span>${formatDate(p.date)}</span>
                <span>${p.debtName}</span>
                <span class="history-amount">−${formatMoney(p.amount)}</span>
            </div>
        `).join("");
}

function openPayModal(id) {
    currentDebtId = id;
    const debt = state.debts.find(d => d.id === id);
    document.getElementById("modalDebtName").textContent = debt.name;
    document.getElementById("paymentInput").value = "";
    document.getElementById("payModal").classList.remove("hidden");
    document.getElementById("paymentInput").focus();
}

function closePayModal() {
    document.getElementById("payModal").classList.add("hidden");
    currentDebtId = null;
}

function confirmPayment() {
    const input = document.getElementById("paymentInput");
    const amount = Number(input.value);

    if (!amount || amount <= 0) {
        alert("Введите корректную сумму платежа");
        return;
    }

    const debt = state.debts.find(d => d.id === currentDebtId);
    if (!debt) return;

    const paidAmount = Math.min(amount, debt.amount);
    debt.amount -= paidAmount;

    state.payments.push({
        debtId: debt.id,
        debtName: debt.name,
        amount: paidAmount,
        date: new Date().toISOString()
    });

    saveState();
    closePayModal();
    render();
}

function undoLastPayment() {
    if (state.payments.length === 0) return;

    const lastPayment = state.payments.pop();
    const debt = state.debts.find(d => d.id === lastPayment.debtId);

    if (debt) {
        debt.amount += lastPayment.amount;
    }

    saveState();
    render();
}

document.getElementById("cancelPay").addEventListener("click", closePayModal);
document.getElementById("confirmPay").addEventListener("click", confirmPayment);
document.getElementById("payModal").addEventListener("click", (e) => {
    if (e.target.id === "payModal") closePayModal();
});
document.getElementById("paymentInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmPayment();
});
document.getElementById("undoBtn").addEventListener("click", undoLastPayment);

render();
