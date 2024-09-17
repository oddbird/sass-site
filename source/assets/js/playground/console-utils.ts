import {Exception, SourceSpan} from 'sass';

import {PlaygroundSelection, PlaygroundState, serializeState} from './utils';

export interface ConsoleLogDebug {
  options: {
    span: SourceSpan;
  };
  message: string;
  type: 'debug';
}

export interface ConsoleLogWarning {
  options: {
    deprecation: boolean;
    span?: SourceSpan | undefined;
    stack?: string | undefined;
    deprecationType?: {
      id: string;
    };
  };
  message: string;
  type: 'warn';
}

export interface ConsoleLogError {
  type: 'error';
  error: Exception | unknown;
}

export type ConsoleLog = ConsoleLogDebug | ConsoleLogWarning | ConsoleLogError;

/**
 * `message` is untrusted.
 *
 * Write with `innerText` and then retrieve using `innerHTML` to encode message
 * for safe display.
 * @param  {string} message The user-submitted string
 * @return {string} The sanitized string
 */
function encodeHTML(message: string): string {
  const el = document.createElement('div');
  el.innerText = message;
  return el.innerHTML;
}

// Converts 0-indexed number to 1-indexed string, or empty string if undefined.
function lineNumberFormatter(number?: number): string {
  if (number === undefined) return '';
  number = number + 1;
  return `${number}`;
}

// Returns undefined if no range, or a link to the state, including range.
function selectionLink(
  playgroundState: PlaygroundState,
  range: PlaygroundSelection
): string | undefined {
  if (!range) return undefined;
  return serializeState({...playgroundState, selection: range});
}

// Returns a safe HTML string for a console item.
export function displayForConsoleLog(
  item: ConsoleLog,
  playgroundState: PlaygroundState
): string {
  const type = item.type;
  let lineNumber = undefined;
  let message = '';
  let safeLink = undefined;
  let range: PlaygroundSelection = null;

  if (item.type === 'error') {
    if (item.error instanceof Exception) {
      const span = item.error.span;
      lineNumber = span.start.line;
      range = [
        span.start.line + 1,
        span.start.column + 1,
        span.end.line + 1,
        span.end.column + 1,
      ];
    }
    message = item.error?.toString() || '';
  } else if (['debug', 'warn'].includes(item.type)) {
    message = item.message;
    let _lineNumber = item.options.span?.start?.line;
    if (item.options.span) {
      const span = item.options.span;
      lineNumber = span.start.line;
      range = [
        span.start.line + 1,
        span.start.column + 1,
        span.end.line + 1,
        span.end.column + 1,
      ];
    }

    if (typeof _lineNumber === 'undefined') {
      const stack = 'stack' in item.options ? item.options.stack : '';
      const needleFromStackRegex = /^- (\d+):(\d+) /;
      const match = stack?.match(needleFromStackRegex);
      if (match?.[1]) {
        // Stack trace starts at 1, all others come from span, which starts at
        // 0, so adjust before formatting.
        _lineNumber = parseInt(match[1]) - 1;
      }
      if (match?.[2]) {
        range = [
          parseInt(match[1]),
          parseInt(match[2]),
          parseInt(match[1]),
          parseInt(match[2]),
        ];
      }
    }
    lineNumber = _lineNumber;

    if (item.type === 'warn' && item.options.deprecationType?.id) {
      safeLink = `https://sass-lang.com/d/${item.options.deprecationType.id}`;
    }
  }
  const link = selectionLink(playgroundState, range);

  const locationStart = link
    ? `<a href="#${link}" class="console-location" data-range=${range}>`
    : '<div class="console-location">';

  const locationEnd = link ? '</a>' : '</div>';

  let html = encodeHTML(message);

  if (safeLink) {
    // Wrap text link in anchor link
    html = html.replace(
      safeLink,
      `<a href="${safeLink}" target="_blank">${safeLink}</a>`
    );
  }

  return `<div class="console-line">${locationStart}<span class="console-type console-type-${
    type
  }">@${type}</span>:${lineNumberFormatter(
    lineNumber
  )}${locationEnd}<div class="console-message">${html}</div></div>`;
}
