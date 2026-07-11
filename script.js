import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB32sChKuPuOoyh70pwYAmS6jnHb8Xf5QU",
    authDomain: "money-tracker-870b1.firebaseapp.com",
    projectId: "money-tracker-870b1",
    storageBucket: "money-tracker-870b1.firebasestorage.app",
    messagingSenderId: "641300531071",
    appId: "1:641300531071:web:5a3e6f8792be93c5e87c4a"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const initialDebts = [
    { id: "mkb", name: "МКБ", amount: 130000, originalAmount: 130000, rate: 59, deadline: "31 июля" },
    { id: "sber", name: "Сбер", amount: 70000, originalAmount: 70000, rate: 26, deadline: "31 августа" },
    { id: "credit62", name: "Кредит 62%", amount: 20000, originalAmount: 20000, rate: 62 },
    { id: "credit59", name: "Кредит 59%", amount: 20000, originalAmount: 20000, rate: 59 }
];

const defaultCashFlow = {
    balance: 0,
    salaryAmount1: 0,
    salaryDay1: 10,
    salaryAmount2: 0,
    salaryDay2: 25,
    expenses: 0,
    reserve: 0
};

let state = { debts: [], payments: [] };
let cashFlowConfig = { ...defaultCashFlow };
let currentDebtId = null;
let editingDebtId = null;
let debtChartInstance = null;
let userDocRef = null;

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

function saveState() {
    if (!userDocRef) return;
    setDoc(userDocRef, { debts: state.debts, payments: state.payments }, { merge: true });
}

function saveCashFlowConfig() {
    if (!userDocRef) return;
    setDoc(userDocRef, { cashFlow: cashFlowConfig }, { merge: true });
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
            <button class="delete-btn" onclick="window.deleteDebt('${debt.id}')" title="Удалить долг">✕</button>
            <button class="edit-btn" onclick="window.openEditDebtModal('${debt.id}')" title="Редактировать долг">✏️</button>
            <h3>${debt.name} ${debt.amount <= 0 ? "✅" : ""}</h3>
            <p><strong>Остаток:</strong> ${formatMoney(debt.amount)}</p>
            <p><strong>Ставка:</strong> ${debt.rate}%</p>
            ${debt.amount > 0
                ? `<button class="pay-btn" onclick="window.openPayModal('${debt.id}')">💸 Внести платеж</button>`
                : `<p class="closed-label">Долг закрыт</p>`}
        `;
        container.appendChild(card);
    });

    renderHistory();
    renderChart();
}

function renderChart() {
    const canvas = document.getElementById("debtChart");
    if (!canvas || typeof Chart === "undefined") return;

    const originalTotal = getOriginalTotal();
    const sortedPayments = state.payments
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = ["Старт"];
    const data = [originalTotal];
    let running = originalTotal;

    sortedPayments.forEach(p => {
        running -= p.amount;
        labels.push(formatDate(p.date));
        data.push(running);
    });

    const isDark = document.body.classList.contains("dark");
    const gridColor = isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)";
    const textColor = isDark ? "#a9adc1" : "#666";

    if (debtChartInstance) {
        debtChartInstance.destroy();
    }

    debtChartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Остаток долга",
                data,
                borderColor: "#4f7cff",
                backgroundColor: "rgba(79,124,255,.15)",
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: "#4f7cff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor } },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, callback: value => formatMoney(value) }
                }
            }
        }
    });
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
        deadline: deadline || ""
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

function openEditDebtModal(id) {
    const debt = state.debts.find(d => d.id === id);
    if (!debt) return;

    editingDebtId = id;
    document.getElementById("editDebtName").value = debt.name;
    document.getElementById("editDebtAmount").value = debt.amount;
    document.getElementById("editDebtRate").value = debt.rate || "";
    document.getElementById("editDebtDeadline").value = debt.deadline || "";
    document.getElementById("editDebtModal").classList.remove("hidden");
}

function closeEditDebtModal() {
    document.getElementById("editDebtModal").classList.add("hidden");
    editingDebtId = null;
}

function confirmEditDebt() {
    const debt = state.debts.find(d => d.id === editingDebtId);
    if (!debt) return;

    const name = document.getElementById("editDebtName").value.trim();
    const newAmount = Number(document.getElementById("editDebtAmount").value);
    const rate = Number(document.getElementById("editDebtRate").value) || 0;
    const deadline = document.getElementById("editDebtDeadline").value.trim();

    if (!name) {
        alert("Введите название долга");
        return;
    }
    if (isNaN(newAmount) || newAmount < 0) {
        alert("Введите корректный остаток долга");
        return;
    }

    const delta = newAmount - debt.amount;
    debt.originalAmount += delta;
    debt.amount = newAmount;
    debt.name = name;
    debt.rate = rate;
    debt.deadline = deadline || "";

    saveState();
    closeEditDebtModal();
    render();
    showToast(`Долг «${name}» обновлён`);
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

document.getElementById("cancelEditDebt").addEventListener("click", closeEditDebtModal);
document.getElementById("confirmEditDebt").addEventListener("click", confirmEditDebt);
document.getElementById("editDebtModal").addEventListener("click", (e) => {
    if (e.target.id === "editDebtModal") closeEditDebtModal();
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
    renderChart();
}

applyTheme(localStorage.getItem(THEME_KEY) || "light");
themeToggle.addEventListener("click", toggleTheme);

// ===== Планировщик денежных потоков =====

function nextOccurrence(day, today) {
    let next = new Date(today.getFullYear(), today.getMonth(), day);
    if (next <= today) {
        next = new Date(today.getFullYear(), today.getMonth() + 1, day);
    }
    return next;
}

function getNextSalary(config) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const date1 = nextOccurrence(config.salaryDay1, today);
    const date2 = nextOccurrence(config.salaryDay2, today);

    const isFirstSooner = date1 <= date2;
    const nextDate = isFirstSooner ? date1 : date2;
    const amount = isFirstSooner ? config.salaryAmount1 : config.salaryAmount2;

    const diffMs = nextDate - today;
    const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    return { days, amount };
}

function renderCashFlow() {
    const available = cashFlowConfig.balance - cashFlowConfig.expenses - cashFlowConfig.reserve;
    const nextSalary = getNextSalary(cashFlowConfig);

    document.getElementById("currentBalanceDisplay").textContent = formatMoney(cashFlowConfig.balance);
    document.getElementById("daysUntilSalaryDisplay").textContent = `${nextSalary.days} дн. (+${formatMoney(nextSalary.amount)})`;
    document.getElementById("expensesDisplay").textContent = formatMoney(cashFlowConfig.expenses);
    document.getElementById("availableDisplay").textContent = formatMoney(Math.max(0, available));

    const statusEl = document.getElementById("cashflowStatus");
    if (available >= 0) {
        statusEl.className = "cashflow-status ok";
        statusEl.textContent = `🟢 Всё в порядке — до зарплаты хватает, ещё останется ${formatMoney(available)}`;
    } else {
        statusEl.className = "cashflow-status warning";
        statusEl.textContent = `⚠️ Внимание: до зарплаты не хватает ${formatMoney(Math.abs(available))}`;
    }
}

function openCashFlowModal() {
    document.getElementById("cfBalance").value = cashFlowConfig.balance || "";
    document.getElementById("cfSalaryAmount1").value = cashFlowConfig.salaryAmount1 || "";
    document.getElementById("cfSalaryDay1").value = cashFlowConfig.salaryDay1 || 10;
    document.getElementById("cfSalaryAmount2").value = cashFlowConfig.salaryAmount2 || "";
    document.getElementById("cfSalaryDay2").value = cashFlowConfig.salaryDay2 || 25;
    document.getElementById("cfExpenses").value = cashFlowConfig.expenses || "";
    document.getElementById("cfReserve").value = cashFlowConfig.reserve || "";
    document.getElementById("cashFlowModal").classList.remove("hidden");
}

function closeCashFlowModal() {
    document.getElementById("cashFlowModal").classList.add("hidden");
}

function confirmCashFlow() {
    const balance = Number(document.getElementById("cfBalance").value) || 0;
    const salaryAmount1 = Number(document.getElementById("cfSalaryAmount1").value) || 0;
    const salaryDay1 = Number(document.getElementById("cfSalaryDay1").value);
    const salaryAmount2 = Number(document.getElementById("cfSalaryAmount2").value) || 0;
    const salaryDay2 = Number(document.getElementById("cfSalaryDay2").value);
    const expenses = Number(document.getElementById("cfExpenses").value) || 0;
    const reserve = Number(document.getElementById("cfReserve").value) || 0;

    if (!salaryDay1 || salaryDay1 < 1 || salaryDay1 > 31 || !salaryDay2 || salaryDay2 < 1 || salaryDay2 > 31) {
        alert("Введите корректные числа месяца для обеих выплат (от 1 до 31)");
        return;
    }

    cashFlowConfig = { balance, salaryAmount1, salaryDay1, salaryAmount2, salaryDay2, expenses, reserve };
    saveCashFlowConfig();
    closeCashFlowModal();
    renderCashFlow();
}

document.getElementById("cashFlowSettingsBtn").addEventListener("click", openCashFlowModal);
document.getElementById("cancelCashFlow").addEventListener("click", closeCashFlowModal);
document.getElementById("confirmCashFlow").addEventListener("click", confirmCashFlow);
document.getElementById("cashFlowModal").addEventListener("click", (e) => {
    if (e.target.id === "cashFlowModal") closeCashFlowModal();
});

// ===== Авторизация и синхронизация =====

function showApp() {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("appContainer").classList.remove("hidden");
}

function showLogin() {
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("appContainer").classList.add("hidden");
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        userDocRef = doc(db, "users", user.uid);
        showApp();

        onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                state.debts = data.debts || [];
                state.payments = data.payments || [];
                cashFlowConfig = data.cashFlow || { ...defaultCashFlow };
            } else {
                state = { debts: initialDebts.map(d => ({ ...d })), payments: [] };
                cashFlowConfig = { ...defaultCashFlow };
                setDoc(userDocRef, {
                    debts: state.debts,
                    payments: state.payments,
                    cashFlow: cashFlowConfig
                });
            }
            render();
            renderCashFlow();
        });
    } else {
        userDocRef = null;
        showLogin();
    }
});

document.getElementById("loginBtn").addEventListener("click", () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errorEl = document.getElementById("loginError");
    errorEl.classList.add("hidden");

    signInWithEmailAndPassword(auth, email, password).catch(() => {
        errorEl.textContent = "Неверный email или пароль";
        errorEl.classList.remove("hidden");
    });
});

document.getElementById("loginPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("loginBtn").click();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth);
});

// Делаем функции доступными для onclick-атрибутов в динамически создаваемых карточках
window.deleteDebt = deleteDebt;
window.openEditDebtModal = openEditDebtModal;
window.openPayModal = openPayModal;
