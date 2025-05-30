"use strict";
const electron = require("electron");
const path = require("path");
const url = require("url");
const fs = require("fs/promises");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var ignore$1 = { exports: {} };
var hasRequiredIgnore;
function requireIgnore() {
  if (hasRequiredIgnore) return ignore$1.exports;
  hasRequiredIgnore = 1;
  function makeArray(subject) {
    return Array.isArray(subject) ? subject : [subject];
  }
  const UNDEFINED = void 0;
  const EMPTY = "";
  const SPACE = " ";
  const ESCAPE = "\\";
  const REGEX_TEST_BLANK_LINE = /^\s+$/;
  const REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/;
  const REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
  const REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
  const REGEX_SPLITALL_CRLF = /\r?\n/g;
  const REGEX_TEST_INVALID_PATH = /^\.*\/|^\.+$/;
  const REGEX_TEST_TRAILING_SLASH = /\/$/;
  const SLASH = "/";
  let TMP_KEY_IGNORE = "node-ignore";
  if (typeof Symbol !== "undefined") {
    TMP_KEY_IGNORE = Symbol.for("node-ignore");
  }
  const KEY_IGNORE = TMP_KEY_IGNORE;
  const define = (object, key, value) => {
    Object.defineProperty(object, key, { value });
    return value;
  };
  const REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g;
  const RETURN_FALSE = () => false;
  const sanitizeRange = (range) => range.replace(
    REGEX_REGEXP_RANGE,
    (match, from, to) => from.charCodeAt(0) <= to.charCodeAt(0) ? match : EMPTY
  );
  const cleanRangeBackSlash = (slashes) => {
    const { length } = slashes;
    return slashes.slice(0, length - length % 2);
  };
  const REPLACERS = [
    [
      // Remove BOM
      // TODO:
      // Other similar zero-width characters?
      /^\uFEFF/,
      () => EMPTY
    ],
    // > Trailing spaces are ignored unless they are quoted with backslash ("\")
    [
      // (a\ ) -> (a )
      // (a  ) -> (a)
      // (a ) -> (a)
      // (a \ ) -> (a  )
      /((?:\\\\)*?)(\\?\s+)$/,
      (_, m1, m2) => m1 + (m2.indexOf("\\") === 0 ? SPACE : EMPTY)
    ],
    // Replace (\ ) with ' '
    // (\ ) -> ' '
    // (\\ ) -> '\\ '
    // (\\\ ) -> '\\ '
    [
      /(\\+?)\s/g,
      (_, m1) => {
        const { length } = m1;
        return m1.slice(0, length - length % 2) + SPACE;
      }
    ],
    // Escape metacharacters
    // which is written down by users but means special for regular expressions.
    // > There are 12 characters with special meanings:
    // > - the backslash \,
    // > - the caret ^,
    // > - the dollar sign $,
    // > - the period or dot .,
    // > - the vertical bar or pipe symbol |,
    // > - the question mark ?,
    // > - the asterisk or star *,
    // > - the plus sign +,
    // > - the opening parenthesis (,
    // > - the closing parenthesis ),
    // > - and the opening square bracket [,
    // > - the opening curly brace {,
    // > These special characters are often called "metacharacters".
    [
      /[\\$.|*+(){^]/g,
      (match) => `\\${match}`
    ],
    [
      // > a question mark (?) matches a single character
      /(?!\\)\?/g,
      () => "[^/]"
    ],
    // leading slash
    [
      // > A leading slash matches the beginning of the pathname.
      // > For example, "/*.c" matches "cat-file.c" but not "mozilla-sha1/sha1.c".
      // A leading slash matches the beginning of the pathname
      /^\//,
      () => "^"
    ],
    // replace special metacharacter slash after the leading slash
    [
      /\//g,
      () => "\\/"
    ],
    [
      // > A leading "**" followed by a slash means match in all directories.
      // > For example, "**/foo" matches file or directory "foo" anywhere,
      // > the same as pattern "foo".
      // > "**/foo/bar" matches file or directory "bar" anywhere that is directly
      // >   under directory "foo".
      // Notice that the '*'s have been replaced as '\\*'
      /^\^*\\\*\\\*\\\//,
      // '**/foo' <-> 'foo'
      () => "^(?:.*\\/)?"
    ],
    // starting
    [
      // there will be no leading '/'
      //   (which has been replaced by section "leading slash")
      // If starts with '**', adding a '^' to the regular expression also works
      /^(?=[^^])/,
      function startingReplacer() {
        return !/\/(?!$)/.test(this) ? "(?:^|\\/)" : "^";
      }
    ],
    // two globstars
    [
      // Use lookahead assertions so that we could match more than one `'/**'`
      /\\\/\\\*\\\*(?=\\\/|$)/g,
      // Zero, one or several directories
      // should not use '*', or it will be replaced by the next replacer
      // Check if it is not the last `'/**'`
      (_, index, str) => index + 6 < str.length ? "(?:\\/[^\\/]+)*" : "\\/.+"
    ],
    // normal intermediate wildcards
    [
      // Never replace escaped '*'
      // ignore rule '\*' will match the path '*'
      // 'abc.*/' -> go
      // 'abc.*'  -> skip this rule,
      //    coz trailing single wildcard will be handed by [trailing wildcard]
      /(^|[^\\]+)(\\\*)+(?=.+)/g,
      // '*.js' matches '.js'
      // '*.js' doesn't match 'abc'
      (_, p1, p2) => {
        const unescaped = p2.replace(/\\\*/g, "[^\\/]*");
        return p1 + unescaped;
      }
    ],
    [
      // unescape, revert step 3 except for back slash
      // For example, if a user escape a '\\*',
      // after step 3, the result will be '\\\\\\*'
      /\\\\\\(?=[$.|*+(){^])/g,
      () => ESCAPE
    ],
    [
      // '\\\\' -> '\\'
      /\\\\/g,
      () => ESCAPE
    ],
    [
      // > The range notation, e.g. [a-zA-Z],
      // > can be used to match one of the characters in a range.
      // `\` is escaped by step 3
      /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
      (match, leadEscape, range, endEscape, close) => leadEscape === ESCAPE ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}` : close === "]" ? endEscape.length % 2 === 0 ? `[${sanitizeRange(range)}${endEscape}]` : "[]" : "[]"
    ],
    // ending
    [
      // 'js' will not match 'js.'
      // 'ab' will not match 'abc'
      /(?:[^*])$/,
      // WTF!
      // https://git-scm.com/docs/gitignore
      // changes in [2.22.1](https://git-scm.com/docs/gitignore/2.22.1)
      // which re-fixes #24, #38
      // > If there is a separator at the end of the pattern then the pattern
      // > will only match directories, otherwise the pattern can match both
      // > files and directories.
      // 'js*' will not match 'a.js'
      // 'js/' will not match 'a.js'
      // 'js' will match 'a.js' and 'a.js/'
      (match) => /\/$/.test(match) ? `${match}$` : `${match}(?=$|\\/$)`
    ]
  ];
  const REGEX_REPLACE_TRAILING_WILDCARD = /(^|\\\/)?\\\*$/;
  const MODE_IGNORE = "regex";
  const MODE_CHECK_IGNORE = "checkRegex";
  const UNDERSCORE = "_";
  const TRAILING_WILD_CARD_REPLACERS = {
    [MODE_IGNORE](_, p1) {
      const prefix = p1 ? `${p1}[^/]+` : "[^/]*";
      return `${prefix}(?=$|\\/$)`;
    },
    [MODE_CHECK_IGNORE](_, p1) {
      const prefix = p1 ? `${p1}[^/]*` : "[^/]*";
      return `${prefix}(?=$|\\/$)`;
    }
  };
  const makeRegexPrefix = (pattern) => REPLACERS.reduce(
    (prev, [matcher, replacer]) => prev.replace(matcher, replacer.bind(pattern)),
    pattern
  );
  const isString = (subject) => typeof subject === "string";
  const checkPattern = (pattern) => pattern && isString(pattern) && !REGEX_TEST_BLANK_LINE.test(pattern) && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern) && pattern.indexOf("#") !== 0;
  const splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF).filter(Boolean);
  class IgnoreRule {
    constructor(pattern, mark, body, ignoreCase, negative, prefix) {
      this.pattern = pattern;
      this.mark = mark;
      this.negative = negative;
      define(this, "body", body);
      define(this, "ignoreCase", ignoreCase);
      define(this, "regexPrefix", prefix);
    }
    get regex() {
      const key = UNDERSCORE + MODE_IGNORE;
      if (this[key]) {
        return this[key];
      }
      return this._make(MODE_IGNORE, key);
    }
    get checkRegex() {
      const key = UNDERSCORE + MODE_CHECK_IGNORE;
      if (this[key]) {
        return this[key];
      }
      return this._make(MODE_CHECK_IGNORE, key);
    }
    _make(mode, key) {
      const str = this.regexPrefix.replace(
        REGEX_REPLACE_TRAILING_WILDCARD,
        // It does not need to bind pattern
        TRAILING_WILD_CARD_REPLACERS[mode]
      );
      const regex = this.ignoreCase ? new RegExp(str, "i") : new RegExp(str);
      return define(this, key, regex);
    }
  }
  const createRule = ({
    pattern,
    mark
  }, ignoreCase) => {
    let negative = false;
    let body = pattern;
    if (body.indexOf("!") === 0) {
      negative = true;
      body = body.substr(1);
    }
    body = body.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
    const regexPrefix = makeRegexPrefix(body);
    return new IgnoreRule(
      pattern,
      mark,
      body,
      ignoreCase,
      negative,
      regexPrefix
    );
  };
  class RuleManager {
    constructor(ignoreCase) {
      this._ignoreCase = ignoreCase;
      this._rules = [];
    }
    _add(pattern) {
      if (pattern && pattern[KEY_IGNORE]) {
        this._rules = this._rules.concat(pattern._rules._rules);
        this._added = true;
        return;
      }
      if (isString(pattern)) {
        pattern = {
          pattern
        };
      }
      if (checkPattern(pattern.pattern)) {
        const rule = createRule(pattern, this._ignoreCase);
        this._added = true;
        this._rules.push(rule);
      }
    }
    // @param {Array<string> | string | Ignore} pattern
    add(pattern) {
      this._added = false;
      makeArray(
        isString(pattern) ? splitPattern(pattern) : pattern
      ).forEach(this._add, this);
      return this._added;
    }
    // Test one single path without recursively checking parent directories
    //
    // - checkUnignored `boolean` whether should check if the path is unignored,
    //   setting `checkUnignored` to `false` could reduce additional
    //   path matching.
    // - check `string` either `MODE_IGNORE` or `MODE_CHECK_IGNORE`
    // @returns {TestResult} true if a file is ignored
    test(path2, checkUnignored, mode) {
      let ignored = false;
      let unignored = false;
      let matchedRule;
      this._rules.forEach((rule) => {
        const { negative } = rule;
        if (unignored === negative && ignored !== unignored || negative && !ignored && !unignored && !checkUnignored) {
          return;
        }
        const matched = rule[mode].test(path2);
        if (!matched) {
          return;
        }
        ignored = !negative;
        unignored = negative;
        matchedRule = negative ? UNDEFINED : rule;
      });
      const ret = {
        ignored,
        unignored
      };
      if (matchedRule) {
        ret.rule = matchedRule;
      }
      return ret;
    }
  }
  const throwError = (message, Ctor) => {
    throw new Ctor(message);
  };
  const checkPath = (path2, originalPath, doThrow) => {
    if (!isString(path2)) {
      return doThrow(
        `path must be a string, but got \`${originalPath}\``,
        TypeError
      );
    }
    if (!path2) {
      return doThrow(`path must not be empty`, TypeError);
    }
    if (checkPath.isNotRelative(path2)) {
      const r = "`path.relative()`d";
      return doThrow(
        `path should be a ${r} string, but got "${originalPath}"`,
        RangeError
      );
    }
    return true;
  };
  const isNotRelative = (path2) => REGEX_TEST_INVALID_PATH.test(path2);
  checkPath.isNotRelative = isNotRelative;
  checkPath.convert = (p) => p;
  class Ignore {
    constructor({
      ignorecase = true,
      ignoreCase = ignorecase,
      allowRelativePaths = false
    } = {}) {
      define(this, KEY_IGNORE, true);
      this._rules = new RuleManager(ignoreCase);
      this._strictPathCheck = !allowRelativePaths;
      this._initCache();
    }
    _initCache() {
      this._ignoreCache = /* @__PURE__ */ Object.create(null);
      this._testCache = /* @__PURE__ */ Object.create(null);
    }
    add(pattern) {
      if (this._rules.add(pattern)) {
        this._initCache();
      }
      return this;
    }
    // legacy
    addPattern(pattern) {
      return this.add(pattern);
    }
    // @returns {TestResult}
    _test(originalPath, cache, checkUnignored, slices) {
      const path2 = originalPath && checkPath.convert(originalPath);
      checkPath(
        path2,
        originalPath,
        this._strictPathCheck ? throwError : RETURN_FALSE
      );
      return this._t(path2, cache, checkUnignored, slices);
    }
    checkIgnore(path2) {
      if (!REGEX_TEST_TRAILING_SLASH.test(path2)) {
        return this.test(path2);
      }
      const slices = path2.split(SLASH).filter(Boolean);
      slices.pop();
      if (slices.length) {
        const parent = this._t(
          slices.join(SLASH) + SLASH,
          this._testCache,
          true,
          slices
        );
        if (parent.ignored) {
          return parent;
        }
      }
      return this._rules.test(path2, false, MODE_CHECK_IGNORE);
    }
    _t(path2, cache, checkUnignored, slices) {
      if (path2 in cache) {
        return cache[path2];
      }
      if (!slices) {
        slices = path2.split(SLASH).filter(Boolean);
      }
      slices.pop();
      if (!slices.length) {
        return cache[path2] = this._rules.test(path2, checkUnignored, MODE_IGNORE);
      }
      const parent = this._t(
        slices.join(SLASH) + SLASH,
        cache,
        checkUnignored,
        slices
      );
      return cache[path2] = parent.ignored ? parent : this._rules.test(path2, checkUnignored, MODE_IGNORE);
    }
    ignores(path2) {
      return this._test(path2, this._ignoreCache, false).ignored;
    }
    createFilter() {
      return (path2) => !this.ignores(path2);
    }
    filter(paths) {
      return makeArray(paths).filter(this.createFilter());
    }
    // @returns {TestResult}
    test(path2) {
      return this._test(path2, this._testCache, true);
    }
  }
  const factory = (options) => new Ignore(options);
  const isPathValid = (path2) => checkPath(path2 && checkPath.convert(path2), path2, RETURN_FALSE);
  if (
    // Detect `process` so that it can run in browsers.
    typeof process !== "undefined" && (process.env && process.env.IGNORE_TEST_WIN32 || process.platform === "win32")
  ) {
    const makePosix = (str) => /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
    checkPath.convert = makePosix;
    const REGEX_TEST_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
    checkPath.isNotRelative = (path2) => REGEX_TEST_WINDOWS_PATH_ABSOLUTE.test(path2) || isNotRelative(path2);
  }
  ignore$1.exports = factory;
  factory.default = factory;
  ignore$1.exports.isPathValid = isPathValid;
  return ignore$1.exports;
}
var ignoreExports = requireIgnore();
const ignore = /* @__PURE__ */ getDefaultExportFromCjs(ignoreExports);
const __filename$1 = url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href);
const __dirname$1 = path.dirname(__filename$1);
console.log("--- main.js started ---");
console.log("__dirname:", __dirname$1);
const DEFAULT_IGNORES = [".git", "node_modules/**"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
async function scanDirectoryRecursive(dirPath, basePath, ig, allFiles = []) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(
        basePath,
        Buffer.from(fullPath).toString()
      );
      const isDirectory = entry.isDirectory();
      if (ig.ignores(isDirectory ? relativePath + "/" : relativePath)) {
        continue;
      }
      if (isDirectory) {
        await scanDirectoryRecursive(fullPath, basePath, ig, allFiles);
      } else if (entry.isFile()) {
        try {
          const stats = await fs.stat(fullPath);
          allFiles.push({ path: fullPath, size: stats.size });
        } catch (statError) {
          console.warn(
            `Could not get stats for file ${fullPath}: ${statError.message}`
          );
          allFiles.push({ path: fullPath, size: null });
        }
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dirPath}: ${error.message}`);
  }
  return allFiles;
}
async function handleScanDirectory(event, dirPath) {
  if (!dirPath) {
    return [];
  }
  console.log(`Scanning directory requested: ${dirPath}`);
  const ig = ignore();
  ig.add(DEFAULT_IGNORES);
  try {
    const gitignoreContent = await fs.readFile(
      path.join(dirPath, ".gitignore"),
      "utf8"
    );
    ig.add(gitignoreContent);
    console.log("Loaded .gitignore rules.");
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Could not read .gitignore:", error.message);
    }
  }
  try {
    const repoIgnoreContent = await fs.readFile(
      path.join(dirPath, "repo_ignore"),
      "utf8"
    );
    ig.add(repoIgnoreContent);
    console.log("Loaded repo_ignore rules.");
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Could not read repo_ignore:", error.message);
    }
  }
  try {
    const files = await scanDirectoryRecursive(dirPath, dirPath, ig);
    console.log(
      `Found ${files.length} file entries (with size) after filtering.`
    );
    return files;
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    return [];
  }
}
async function handleReadFileContent(event, filePath) {
  console.log(`Received request to read file: ${filePath}`);
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE_BYTES) {
      console.warn(`File too large: ${filePath} (${stats.size} bytes)`);
      return { error: "FileTooLarge", size: stats.size, path: filePath };
    }
    if (!stats.isFile()) {
      console.warn(`Not a file: ${filePath}`);
      return { error: "NotAFile", path: filePath };
    }
    const content = await fs.readFile(filePath, "utf-8");
    console.log(`Successfully read file: ${filePath}`);
    return { content, path: filePath };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    if (error.code === "ENOENT") {
      return { error: "NotFound", message: error.message, path: filePath };
    } else if (error.code === "EACCES") {
      return {
        error: "PermissionDenied",
        message: error.message,
        path: filePath
      };
    } else {
      return { error: "ReadError", message: error.message, path: filePath };
    }
  }
}
function createWindow() {
  console.log("--- createWindow called ---");
  const win = new electron.BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // __dirname is the path to the current executing script (main.js)
      // path.join connects it with the path to preload.js
      preload: path.join(__dirname$1, "preload.js"),
      nodeIntegration: false,
      // Keep false for security
      contextIsolation: true
      // Set to true for secure IPC
    }
  });
  if (!electron.app.isPackaged) {
    console.log("Loading DEV URL: http://localhost:5173");
    win.loadURL("http://localhost:5173");
  } else {
    const indexPath = path.join(
      __dirname$1,
      "../renderer/main_window/index.html"
    );
    console.log(`Loading PROD file: ${indexPath}`);
    win.loadFile(indexPath);
  }
}
async function handleFileOpen() {
  const { canceled, filePaths } = await electron.dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  if (!canceled && filePaths.length > 0) {
    return filePaths[0];
  }
  return null;
}
electron.app.whenReady().then(async () => {
  electron.ipcMain.handle("dialog:openDirectory", handleFileOpen);
  electron.ipcMain.handle("scan:directory", handleScanDirectory);
  electron.ipcMain.handle("file:readContent", handleReadFileContent);
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
