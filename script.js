const debts = [
    {
        name: "МКБ",
        amount: 130000,
        rate: "59%",
        paid: false
    },
    {
        name: "Сбербанк",
        amount: 70000,
        rate: "0%",
        paid: false
    },
    {
        name: "Кредит №1",
        amount: 20000,
        rate: "62%",
        paid: false
    },
    {
        name: "Кредит №2",
        amount: 20000,
        rate: "59%",
        paid: false
    }
];

const table = document.getElementById("debtsTable");

function formatMoney(value) {
    return value.toLocaleString("ru-RU") + " ₽";
}

function render() {

    table.innerHTML = "";

    let total = 0;
    let paid = 0;

    debts.forEach(debt => {

        total += debt.amount;

        if (debt.paid) {
            paid += debt.amount;
        }

        table.innerHTML += `
            <tr>
                <td>${debt.name}</td>
                <td>${formatMoney(debt.amount)}</td>
                <td>${debt.rate}</td>
                <td>${debt.paid ? "✅ Погашен" : "⏳ В процессе"}</td>
            </tr>
        `;
    });

    document.getElementById("totalDebt").textContent = formatMoney(total);
    document.getElementById("paidDebt").textContent = formatMoney(paid);
    document.getElementById("remainingDebt").textContent = formatMoney(total - paid);
}

render();
