/*
    \x1b[30m -> foreground
    \x1b[30;40m -> foreground + background
    \x1b[0m -> reset
    \x1Bc -> clear console
*/

const PREFIX = '_  ';
const BOX_PADDING = 2;
const BORDER = ['┌', '┐', '┘', '└', '─', '│', ' ', '├', '┤'];

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
  reset: 0
};

const colorize = (color, content) => color ? `\x1b[${color}m${content}\x1b[0m` : content;

const extractColors = str => {
  if (!/[<>]/.test(str)) return str;
  return str
    .split(/<\/(?![hb]r)\w+>/)
    .map(str => {
      return str.replace(/<(?![hb]r)(\w+)>(<(\w+)>)?([^<]+)/g, (_, color, __, bg, text) => {
        const code = [color, bg].filter(Boolean).map((c, i) => map[c + (i ? 'bg' : '')]).join(';');
        return colorize(code, text);
      });
    })
    .join('');
};

const getLength = str => {
  return str.replace(/\x1B\[[0-9;]+m/g, '').length;
};

const makeBox = str => {
  return str.replace(/<box\s?(\w+)?>((.|[\r\n])+?)<\/box>/g, (_, colorString, text = '') => {
    const color = map[colorString];
    const [TL, TR, BR, BL, H, V, S, ML, MR] = BORDER.map(c => colorize(color, c));

    const content = extractColors(text)
      .replace(/<hr>/g, '\n<hr>\n')
      .split(/\n/) // support template sting newline
      .map(str => str.trim()) // clean template string indent
      .filter(Boolean)
      .flatMap(str => str.replace(/(<br>)+/g, m => '\n'.repeat(m.length / 4)).split(/\n/))
      .reduce((acc, str, i, arr) => {
        return !str && !arr[i - 1] ? acc : acc.concat(str);
      }, []) // max one spacer

    const lengths = content.map(str => getLength(str));
    const max = Math.max.apply(null, lengths);
    const width = max + BOX_PADDING * 2;
    const border = H.repeat(width);
    const spacer = V + S.repeat(width) + V;
    const divider = ML + H.repeat(width) + MR;
    const tab = ' '.repeat(PREFIX.length);

    const boxLine = (c, i) => /^<br>$/.test(c)
      ? spacer
      : /^<hr>$/.test(c)
        ? divider
        : V + S.repeat(BOX_PADDING) + c + S.repeat(max - lengths[i] + BOX_PADDING) + V;

    const parts = [
      '\r',
      `${TL}${border}${TR}`,
      ...content.map(boxLine),
      `${BL}${border}${BR}`
    ];

    return parts.map(str => tab + str).join('\n')
  })
};

const parseColors = args => {
  let str = [...args].join(' ');
  const hasBox = /<box/.test(str);
  if (hasBox) str = makeBox(str);
  return (hasBox ? '' : PREFIX) + extractColors(str);
}

export default active => function(...args) {
  if (!active || /^\/favicon/.test(args[1])) return;
  if (this === null) {
    return console.clear();
  }
  const out = parseColors(args);
  return process.env.npm_lifecycle_event === 'test' ? out : console.log(out);
};
