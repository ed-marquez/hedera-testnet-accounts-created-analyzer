import chalk from "chalk";
import config from "../config.js";

const timestamp = () => `[${new Date().toISOString()}]`;

// Log levels in order of severity
const LOG_LEVELS = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const currentLevel = LOG_LEVELS[config.LOG_LEVEL] || LOG_LEVELS.info;

const shouldLog = (level) => LOG_LEVELS[level] >= currentLevel;

const logger = {
	debug: (msg) => {
		if (shouldLog("debug")) {
			console.log(`${timestamp()} ${chalk.gray.bold("[DEBUG]")} ${msg}`);
		}
	},
	info: (msg) => {
		if (shouldLog("info")) {
			console.log(`${timestamp()} ${chalk.blue.bold("[INFO]")} ${msg}`);
		}
	},
	warn: (msg) => {
		if (shouldLog("warn")) {
			console.warn(`${timestamp()} ${chalk.yellow.bold("[WARN]")} ${msg}`);
		}
	},
	error: (msg) => {
		if (shouldLog("error")) {
			console.error(`${timestamp()} ${chalk.red.bold("[ERROR]")} ${msg}`);
		}
	},
	success: (msg) => {
		if (shouldLog("info")) {
			console.log(`${timestamp()} ${chalk.green.bold("[SUCCESS]")} ${msg}`);
		}
	},
};

export default logger;
