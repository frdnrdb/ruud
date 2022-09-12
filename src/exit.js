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
        log.call('magenta', 'gracefully shutting down');

        while (exitQueue.length) {
            const [ name, func ] = exitQueue.shift();
            await func();
            log.call('cyan', name, 'shut down');
        }
    };

    const handle = signal => async (err, message) => {        
        if (signal === 'SIGINT') process.stdout.write('\b\b'); // remove ^C

        log.call('magenta', signal, err, message);

        if (/^(SIG)/.test(signal) || /EADDR/.test(message)) {
            await stop();
            process.exit(0);
        }
    };

    signals.forEach(signal => process.on(signal, handle(signal)));

    return {
        add(name, func) {
            exitQueue.push([ name, func ]);
        },
        stop
    };
}