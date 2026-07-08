const debts = [
    {
        name: "МКБ",
        amount: 130000,
        rate: 59,
        deadline: "31 июля"
    },
    {
        name: "Сбер",
        amount: 70000,
        rate: 0,
        deadline: "31 августа"
    },
    {
        name: "Кредит 62%",
        amount: 20000,
        rate: 62
    },
    {
        name: "Кредит 59%",
        amount: 20000,
        rate: 59
    }
];

function formatMoney(value) {
    return value.toLocaleString("ru-RU") + " ₽";
}

function render() {

    const container = document.getElementById("debtsContainer");

    container.innerHTML = "";

    const total = debts.reduce((sum, debt) => sum + debt.amount, 0);

    document.getElementById("totalDebt").textContent = formatMoney(total);
    document.getElementById("paidDebt").textContent = "0 ₽";
    document.getElementById("remainingDebt").textContent = formatMoney(total);

    const goal = debts[0];

    document.getElementById("goalName").textContent = goal.name;
    document.getElementById("goalText").textContent =
        `Осталось погасить ${formatMoney(goal.amount)}${goal.deadline ? " до " + goal.deadline : ""}`;

    document.getElementById("progressFill").style.width = "0%";

    debts.forEach((debt) => {

        const card = document.createElement("div");

        card.className = "debt-card";

        card.innerHTML = `
            <h3>${debt.name}</h3>

            <p><strong>Остаток:</strong> ${formatMoney(debt.amount)}</p>

            <p><strong>Ставка:</strong> ${debt.rate}%</p>

            <button class="pay-btn" onclick="pay('${debt.name}')">
                💸 Внести платеж
            </button>
        `;

        container.appendChild(card);

    });

}

function pay(name) {

    alert("Совсем скоро здесь можно будет внести платеж для: " + name);

}

render();
