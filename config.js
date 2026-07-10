// ================================
// 🌱 Debt Tracker Configuration
// ================================

const CONFIG_KEY = "debtTrackerConfig";

const DEFAULT_CONFIG = {

    // Доходы
    salary: 80000,
    averageAdvance: 38000,
    averageSalary: 42000,
    quarterlyBonus: 37000,

    // Даты выплат
    salaryDay: 10,
    advanceDay: 25,
    creditPaymentDay: 26,

    // Обязательные расходы
    expenses: {
        utilities: 3500,
        internet: 2000,
        transport: 4000,
        gym: 3000,
        medicine: 1000,
        cat: 1000,
        language: 4000,
        household: 1000
    },

    // Финансовая подушка
    emergencyFundGoal: 50000,

    // Резерв на кредиты
    reserve: 45500

};

// ================================

function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// ================================

function loadConfig() {

    const saved = localStorage.getItem(CONFIG_KEY);

    if (!saved) {
        saveConfig(DEFAULT_CONFIG);
        return structuredClone(DEFAULT_CONFIG);
    }

    try {
        return JSON.parse(saved);
    } catch (e) {
        saveConfig(DEFAULT_CONFIG);
        return structuredClone(DEFAULT_CONFIG);
    }

}

// ================================

const config = loadConfig();
