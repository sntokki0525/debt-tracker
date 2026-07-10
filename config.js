const CONFIG_KEY = "debtTrackerConfig";

const DEFAULT_CONFIG = {
    salary: 80000,
    averageAdvance: 38000,
    averageSalary: 42000,
    quarterlyBonus: 37000,

    salaryDay: 10,
    advanceDay: 25,
    creditDay: 26,

    fixedExpenses: {
        utilities: 3500,
        internet: 2000,
        transport: 4000,
        gym: 3000,
        medicine: 1000,
        cat: 1000,
        language: 4000,
        household: 1000
    },

    reserve: 45500
};

function loadConfig() {
    const saved = localStorage.getItem(CONFIG_KEY);

    if (!saved) {
        saveConfig(DEFAULT_CONFIG);
        return structuredClone(DEFAULT_CONFIG);
    }

    try {
        return JSON.parse(saved);
    } catch {
        saveConfig(DEFAULT_CONFIG);
        return structuredClone(DEFAULT_CONFIG);
    }
}

function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

let config = loadConfig();
