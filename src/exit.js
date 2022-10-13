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
        log('<magenta>gracefully shutting down</magenta>');

        while (exitQueue.length) {
            const [ name, func ] = exitQueue.shift();
            await func();
            log(`<magenta>${name} shut down</magenta>`);
        }
    };

    const handle = async (signal, message) => {        
        if (signal === 'SIGINT') process.stdout.write('\b\b'); // remove ^C

        log(`<red>${signal}</red>`, message);

        if (/^(SIG)/.test(signal) || /EADDR/.test(message)) {
            await stop();
            process.exit(0);
        }
    };

    signals.forEach(signal => process.on(signal, handle));

    return {
        add(name, func) {
            exitQueue.push([ name, func ]);
        },
        stop
    };
}