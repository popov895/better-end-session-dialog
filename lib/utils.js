'use strict';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const extensionUuid = Gio.File.new_for_path(new Error().fileName + `/../..`).get_basename();

export const _ = (text, context) => {
    return context ? GLib.dpgettext2(extensionUuid, context, text) : GLib.dgettext(extensionUuid, text);
};

export const logError = (...args) => {
    console.error(`${extensionUuid}:`, ...args);
};
