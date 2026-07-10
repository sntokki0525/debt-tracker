// =======================================
// 💰 Finance Engine
// Все финансовые расчёты проекта
// =======================================

// Общая сумма долгов
function calculateTotalDebt(debts) {
    return debts.reduce((sum, debt) => sum + debt.amount, 0);
}

// Сколько уже погашено
function calculatePaidDebt(debts) {
    return debts.reduce((sum, debt) => {
        return sum + ((debt.originalAmount || debt.amount) - debt.amount);
    }, 0);
}

// Остаток долга
function calculateRemainingDebt(debts) {
    return calculateTotalDebt(debts);
}

// Общая первоначальная сумма долгов
function calculateOriginalDebt(debts) {
    return debts.reduce((sum, debt) => {
        return sum + (debt.originalAmount || debt.amount);
    }, 0);
}

// Процент погашения
function calculateProgress(debts) {

    const original = calculateOriginalDebt(debts);

    if (original === 0) return 100;

    return Math.round(
        calculatePaidDebt(debts) / original * 100
    );

}

// Все обязательные расходы
function calculateMonthlyExpenses(config) {

    return Object.values(config.expenses)
        .reduce((sum, value) => sum + value, 0);

}

// Минимальный резерв
function calculateReserve(config) {

    return config.reserve;

}

// Сколько можно потратить
function calculateAvailableMoney(balance, config) {

    return Math.max(
        balance
        - calculateReserve(config)
        - calculateMonthlyExpenses(config),
        0
    );

}

// Следующая зарплата
function getNextSalaryDate(config) {

    const today = new Date();

    const salary = new Date(
        today.getFullYear(),
        today.getMonth(),
        config.salaryDay
    );

    const advance = new Date(
        today.getFullYear(),
        today.getMonth(),
        config.advanceDay
    );

    if (today <= salary)
        return salary;

    if (today <= advance)
        return advance;

    return new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        config.salaryDay
    );

}

// Сколько дней осталось
function getDaysUntilSalary(config) {

    const next = getNextSalaryDate(config);

    const today = new Date();

    const diff =
        next.getTime() -
        today.getTime();

    return Math.ceil(
        diff / (1000 * 60 * 60 * 24)
    );

}

// Красивое отображение денег
function formatMoney(value) {

    return new Intl.NumberFormat(
        "ru-RU",
        {
            style: "currency",
            currency: "RUB",
            maximumFractionDigits: 0
        }
    ).format(value);

}
