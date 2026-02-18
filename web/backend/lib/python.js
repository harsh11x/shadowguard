/**
 * Python subprocess bridge.
 * Spawns `python3 main.py --json <command> [args]` and returns a promise
 * that resolves with all parsed JSON lines emitted by the process.
 *
 * For streaming (SSE), use spawnStream() which calls onLine for each JSON line.
 */

const { spawn } = require('child_process');
const path = require('path');

// Absolute path to the Python project root
const PYTHON_ROOT = path.resolve(__dirname, '../../../');
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const MAIN_PY = path.join(PYTHON_ROOT, 'main.py');

/**
 * Run a Python command and collect all JSON lines.
 * @param {string[]} args - CLI args after `main.py --json`
 * @returns {Promise<object[]>} - array of parsed JSON objects
 */
function runPython(args) {
    return new Promise((resolve, reject) => {
        const allArgs = ['--json', ...args];
        const proc = spawn(PYTHON_BIN, [MAIN_PY, ...allArgs], {
            cwd: PYTHON_ROOT,
            env: { ...process.env },
        });

        const lines = [];
        let stderr = '';
        let stdout = '';

        proc.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
            // Parse complete JSON lines
            const parts = stdout.split('\n');
            stdout = parts.pop(); // keep incomplete last line
            for (const line of parts) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                    lines.push(JSON.parse(trimmed));
                } catch {
                    // Non-JSON output (e.g. logging) — ignore
                }
            }
        });

        proc.stderr.on('data', (chunk) => {
            const msg = chunk.toString();
            stderr += msg;
            console.error(`[python-stderr] ${msg}`);
        });

        proc.on('close', (code, signal) => {
            if (code !== 0 && lines.length === 0) {
                reject(new Error(`Python exited ${code || signal}: ${stderr.slice(0, 500)}`));
            } else {
                resolve(lines);
            }
        });

        proc.on('error', (err) => reject(new Error(`Failed to spawn Python: ${err.message}`)));
    });
}

/**
 * Spawn a Python command and stream JSON lines to a callback.
 * Used for SSE simulation streaming.
 * @param {string[]} args
 * @param {function(object): void} onLine - called for each parsed JSON line
 * @param {function(number): void} onClose - called when process exits
 * @returns {{ kill: function }} - handle to kill the process
 */
function spawnStream(args, onLine, onClose) {
    const allArgs = ['--json', ...args];
    const proc = spawn(PYTHON_BIN, [MAIN_PY, ...allArgs], {
        cwd: PYTHON_ROOT,
        env: { ...process.env },
    });

    let buffer = '';

    proc.stdout.on('data', (chunk) => {
        buffer += chunk.toString();
        const parts = buffer.split('\n');
        buffer = parts.pop();
        for (const line of parts) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                onLine(JSON.parse(trimmed));
            } catch {
                // ignore non-JSON lines
            }
        }
    });

    proc.stderr.on('data', (chunk) => {
        console.error(`[python-stream-stderr] ${chunk.toString()}`);
    });

    const timeout = setTimeout(() => {
        if (!proc.killed) {
            proc.kill('SIGKILL');
            onClose(-1, 'TIMEOUT');
        }
    }, 60000); // 60s safety timeout for slow RPCs

    proc.on('close', (code, signal) => {
        clearTimeout(timeout);
        // Flush remaining buffer
        if (buffer.trim()) {
            try { onLine(JSON.parse(buffer.trim())); } catch { }
        }
        onClose(code, signal);
    });

    return { kill: () => { clearTimeout(timeout); proc.kill(); } };
}

module.exports = { runPython, spawnStream, PYTHON_ROOT };
