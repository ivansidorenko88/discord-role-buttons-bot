const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const defaultConfig = {
  messageId: null,
  buttons: []
};

function ensureConfig() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
  }
}

function loadConfig() {
  ensureConfig();
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      messageId: parsed.messageId ?? null,
      buttons: Array.isArray(parsed.buttons) ? parsed.buttons : []
    };
  } catch {
    saveConfig(defaultConfig);
    return { ...defaultConfig };
  }
}

function saveConfig(config) {
  ensureConfig();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

module.exports = { loadConfig, saveConfig };
