const signals = [ 
    'SIGTERM',
    'SIGINT',
    'EADDRINUSE',
    'unhandledRejection',
    'uncaughtException'
];

export default log => {
    const exitQueue = [];

    const stop = async () => {
        for (const func of exitQueue) {
            log(await func(), 'shut down');
        }
    };

    const handle = signal => async (err, message) => {        
        if (signal === 'SIGINT') process.stdout.write('\b\b'); // remove ^C

        log.call(31, signal, err, message);

        if (/^(SIG)/.test(signal) || /EADDR/.test(message)) {
            await stop();
            process.exit(0);
        }
    };

    signals.forEach(signal => process.on(signal, handle(signal)));

    return {
        add(func) {
            exitQueue.push(func);
        },
        stop
    };
}