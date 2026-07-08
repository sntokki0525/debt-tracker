const STORAGE_KEY = "debtTrackerState";

const initialDebts = [
    { id: "mkb", name: "МКБ", amount: 130000, originalAmount: 130000, rate: 59, deadline: "31 июля" },
    { id: "sber", name: "Сбер", amount: 70000, originalAmount: 70000, rate: 0, deadline: "31 августа" },
    { id: "credit62", name: "Кредит 62%", amount: 20000, originalAmount: 20000, rate: 62 },
    { id: "credit59", name: "Кредит 59%", amount: 20000, originalAmount: 20000, rate: 59 }
];

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // На случай если долг сохранён ещё до появления originalAmount
            parsed.debts.forEach(d => {
                if (d.originalAmount === undefined) d.originalAmount = d.amount;
            });
            return parsed;
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

function getOriginalTotal() {
    return state.debts.reduce((sum, d) => sum + d.originalAmount, 0);
}

function getTotalProgress() {
    const originalTotal = getOriginalTotal();
    const remainingTotal = state.debts.reduce((sum, d) => sum + d.amount, 0);
    const paidTotal = originalTotal - remainingTotal;
    return originalTotal > 0 ? Math.round((paidTotal / originalTotal) * 100) : 0;
}

function render() {
    const container = document.getElementById("debtsContainer");
    container.innerHTML = "";

    const originalTotal = getOriginalTotal();
    const remainingTotal = state.debts.reduce((sum, d) => sum + d.amount, 0);
    const paidTotal = originalTotal - remainingTotal;
    const progressPercent = getTotalProgress();

    document.getElementById("totalDebt").textContent = formatMoney(originalTotal);
    document.getElementById("paidDebt").textContent = formatMoney(paidTotal);
    document.getElementById("remainingDebt").textContent = formatMoney(remainingTotal);
    document.getElementById("progressFill").style.width = progressPercent + "%";
    document.getElementById("progressLabel").textContent = progressPercent >= 10 ? progressPercent + "%" : "";

    const activeDebts = state.debts.filter(d => d.amount > 0);
    const goal = activeDebts[0];

    if (goal) {
        document.getElementById("goalName").textContent = goal.name;
        document.getElementById("goalText").textContent =
            `Осталось погасить ${formatMoney(goal.amount)}${goal.deadline ? " до " + goal.deadline : ""}`;
    } else if (state.debts.length === 0) {
        document.getElementById("goalName").textContent = "Долгов пока нет";
        document.getElementById("goalText").textContent = "Добавь первый долг, чтобы начать отслеживание.";
    } else {
        document.getElementById("goalName").textContent = "🎉 Все долги закрыты!";
        document.getElementById("goalText").textContent = "Ты справилась. Свобода достигнута!";
    }

    if (state.debts.length === 0) {
        container.innerHTML = `<p class="empty-text">Долгов пока нет — добавь первый через кнопку выше</p>`;
    }

    state.debts.forEach(debt => {
        const card = document.createElement("div");
        card.className = "debt-card" + (debt.amount <= 0 ? " closed" : "");
        card.innerHTML = `
            <button class="delete-btn" onclick="deleteDebt('${debt.id}')" title="Удалить долг">✕</button>
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

const motivationPhrases = [
    "Отличное начало! Каждый платёж приближает тебя к свободе 💪",
    "Так держать! Долг становится всё меньше 🎯",
    "Красавица! Ещё один шаг к финансовой свободе ✨",
    "Прогресс есть прогресс — гордись собой 👏",
    "Отлично! Ты снова сделала шаг вперёд 🚀"
];

const milestonePhrases = {
    25: "🎉 Четверть пути пройдена! Ты справляешься отлично.",
    50: "🔥 Половина долгов позади! Это уже серьёзный результат.",
    75: "💎 Осталась всего четверть — финал уже близко!",
    100: "🏆 Все долги закрыты! Ты дошла до финансовой свободы!"
};

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 4000);
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

    const progressBefore = getTotalProgress();

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

    const progressAfter = getTotalProgress();
    const crossedMilestone = [25, 50, 75, 100].find(
        m => progressBefore < m && progressAfter >= m
    );

    if (crossedMilestone) {
        showToast(milestonePhrases[crossedMilestone]);
    } else {
        const phrase = motivationPhrases[Math.floor(Math.random() * motivationPhrases.length)];
        showToast(`Долг уменьшился на ${formatMoney(paidAmount)}. ${phrase}`);
    }
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

function slugify(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-zа-я0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "") || "debt";
}

function openAddDebtModal() {
    document.getElementById("newDebtName").value = "";
    document.getElementById("newDebtAmount").value = "";
    document.getElementById("newDebtRate").value = "";
    document.getElementById("newDebtDeadline").value = "";
    document.getElementById("addDebtModal").classList.remove("hidden");
    document.getElementById("newDebtName").focus();
}

function closeAddDebtModal() {
    document.getElementById("addDebtModal").classList.add("hidden");
}

function confirmAddDebt() {
    const name = document.getElementById("newDebtName").value.trim();
    const amount = Number(document.getElementById("newDebtAmount").value);
    const rate = Number(document.getElementById("newDebtRate").value) || 0;
    const deadline = document.getElementById("newDebtDeadline").value.trim();

    if (!name) {
        alert("Введите название долга");
        return;
    }
    if (!amount || amount <= 0) {
        alert("Введите корректную сумму долга");
        return;
    }

    let id = slugify(name);
    if (state.debts.some(d => d.id === id)) {
        id = id + "-" + Date.now();
    }

    state.debts.push({
        id,
        name,
        amount,
        originalAmount: amount,
        rate,
        deadline: deadline || undefined
    });

    saveState();
    closeAddDebtModal();
    render();
    showToast(`Добавлен новый долг: ${name}`);
}

function deleteDebt(id) {
    const debt = state.debts.find(d => d.id === id);
    if (!debt) return;

    const confirmed = confirm(`Удалить долг "${debt.name}"? Это действие нельзя отменить.`);
    if (!confirmed) return;

    state.debts = state.debts.filter(d => d.id !== id);
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

document.getElementById("addDebtBtn").addEventListener("click", openAddDebtModal);
document.getElementById("cancelAddDebt").addEventListener("click", closeAddDebtModal);
document.getElementById("confirmAddDebt").addEventListener("click", confirmAddDebt);
document.getElementById("addDebtModal").addEventListener("click", (e) => {
    if (e.target.id === "addDebtModal") closeAddDebtModal();
});

const THEME_KEY = "debtTrackerTheme";
const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {
    if (theme === "dark") {
        document.body.classList.add("dark");
        themeToggle.textContent = "☀️";
    } else {
        document.body.classList.remove("dark");
        themeToggle.textContent = "🌙";
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains("dark");
    const newTheme = isDark ? "light" : "dark";
    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(newTheme);
}

applyTheme(localStorage.getItem(THEME_KEY) || "light");
themeToggle.addEventListener("click", toggleTheme);

render();
