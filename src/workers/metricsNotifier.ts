import {Worker} from 'node:worker_threads';
import {FastifyBaseLogger} from 'fastify';
import fs from 'fs';

let worker: Worker | null = null;

/**
 * Starts the worker thread that listens on agrosmart/metrics and forwards its logs to the Fastify logger.
 * If the worker crashes it is restarted after 5 seconds.
 */
export function startMetricsNotifier(logger: FastifyBaseLogger) {
    const log = logger.child({module: 'metrics-notifier'});
    if(!fs.existsSync('./firebase-service-account.json')) {
        log.warn("Firebase configuration is not here. Disabling cloud notification.")
        return;
    }

    worker = new Worker(new URL('./metricsNotifier.worker.ts', import.meta.url));

    worker.on('message', (message) => {
        if (message?.type === 'log') {
            log[message.level as 'debug' | 'info' | 'warn' | 'error'](message.msg);
        }
    });

    worker.on('error', (err) => log.error(err, 'Metrics notifier worker error'));

    worker.on('exit', (code) => {
        worker = null;
        if (code !== 0) {
            log.error(`Metrics notifier worker exited with code ${code}, restarting in 5s`);
            setTimeout(() => startMetricsNotifier(logger), 5000);
        }
    });
}