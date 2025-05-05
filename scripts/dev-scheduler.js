import cron from "node-cron";
import { exec } from "child_process";

// Run every 5 minutes
cron.schedule("*/5 * * * *", () => {
	console.log("🕒 Scheduled job triggered");
	exec("node index.js", (err, stdout, stderr) => {
		if (err) {
			console.error(`Error: ${err.message}`);
		}
		if (stdout) console.log(stdout);
		if (stderr) console.error(stderr);
	});
});

console.log("✅ Scheduler started. Waiting for next run...");
