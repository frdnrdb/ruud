/*
    \x1b[30m -> foreground
    \x1b[30;40m -> foreground + background
    \x1b[0m -> reset
*/

const DEFAULT_COLOR = 34;
const PREFIX = '⟶  ';
const BOX_PADDING = 3;

const BORDER = [ '┌', '┐', '┘', '└', '─', '│', ' ', '├', '┤' ];
const [ TL, TR, BR, BL, H, V, S, ML, MR ] = BORDER;

const map = {
    blackbg: 40,
    redbg: 41,
    greenbg: 42,
    yellowbg: 43,
    bluebg: 44,
    magentabg: 45,
    cyanbg: 46,
    whitebg: 47,
    black: 30,
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    magenta: 35,
    cyan: 36,
    white: 37,
};

const colorize = (color, content) => `\x1b[${color}m${content}\x1b[0m`;

const setColor = n => n instanceof Number 
    ? n 
    : (typeof n === 'string' && map[n]) || DEFAULT_COLOR;

const makeBox = (arg, args, color) => {
    const content = [arg, ...args].filter(n => typeof n === 'string' && n);
    const max = Math.max.apply(null, content.map(str => str.length));
    const width = max + BOX_PADDING * 2;
    const border = H.repeat(width);
    const spacer = V + S.repeat(width) + V;
    const divider = ML + H.repeat(width) + MR;
    const tab = ' '.repeat(PREFIX.length);

    const boxLine = c => /^\-+$/.test(c)
        ? divider
        : /^\s+$/.test(c)
            ? spacer
            : V + S.repeat(BOX_PADDING) + colorize(color, c) + S.repeat(max - c.length + BOX_PADDING) + V;

    return [`${TL}${border}${TR}`, ...content.map(boxLine), `${BL}${border}${BR}\n`].map((str, i) => (!i ? '' : '\n') + tab + str);
};

export default DEV => {
    DEV && console.log('\x1Bc'); // clear console 

    return function(arg, ...args) {
        if (!DEV || /favicon/.test(arg)) return;

        const isObject = typeof this === 'object';
        const isBox = isObject && this.type === 'box';
        const color = setColor(isObject ? this.color : this);

        const content = isBox ? makeBox(arg, args, color) : [ PREFIX, colorize(color, arg), ...args.filter(Boolean) ];

        console.log(...content);
    };
}