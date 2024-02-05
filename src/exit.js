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
        while (exitQueue.length) {
            const [ name, func ] = exitQueue.shift();
            await func();
            log(`<magenta>${name} shut down</magenta>`);
        }
    };

    const handle = async (signal, message) => {        
        if (/^SIG/.test(signal)) process.stdout.write('\b\b\n'); // remove ^C

        log(`<red>${signal}</red>`, message);

        if (/^(SIG)/.test(signal) || /EADDR/.test(message + signal)) {
            await stop();

            // assume --watch and make time for stdout consumption
            if (signal === 'SIGTERM') {
                process.stdout.write('\n');
                await new Promise(r => setTimeout(r, 2000));
            }

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