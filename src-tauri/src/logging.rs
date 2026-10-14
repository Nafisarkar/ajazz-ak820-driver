//! Minimal file logger — the app runs detached from a console, so diagnostics
//! have to land in a file to be useful.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::{Instant, SystemTime};

struct Logger {
    file: Mutex<std::fs::File>,
    start: Instant,
}

static LOGGER: OnceLock<Logger> = OnceLock::new();

pub fn init(path: PathBuf) {
    if let Ok(file) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = LOGGER.set(Logger {
            file: Mutex::new(file),
            start: Instant::now(),
        });
        info(format!("--- session start ({}) ---", path.display()).as_str());
    }
}

pub fn info(message: &str) {
    write("INFO", message);
}

pub fn warn(message: &str) {
    write("WARN", message);
}

fn write(level: &str, message: &str) {
    let Some(logger) = LOGGER.get() else { return };
    let elapsed = logger.start.elapsed().as_secs_f64();
    let wall = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    if let Ok(mut file) = logger.file.lock() {
        let _ = writeln!(file, "[{wall} +{elapsed:8.3}s] {level:4} {message}");
        let _ = file.flush();
    }
}
