'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

var _ = (text, context) => {
    return context ? ExtensionUtils.pgettext(context, text) : ExtensionUtils.gettext(text);
};

var logError = (...args) => {
    console.error(`${Extension.uuid}:`, ...args);
};
