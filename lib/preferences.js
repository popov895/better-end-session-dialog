'use strict';

import GObject from 'gi://GObject';

export const Preferences = GObject.registerClass(
class Preferences extends GObject.Object {
    static [GObject.GTypeName] = `BetterEndSessionDialog_Preferences`;

    static [GObject.properties] = {
        'showSuspendButton': GObject.ParamSpec.boolean(
            `showSuspendButton`, ``, ``,
            GObject.ParamFlags.READWRITE,
            0, 100, 50
        ),
    };

    constructor(extension) {
        super();

        this._keyShowSuspendButton = `show-suspend-button`;

        this._settings = extension.getSettings();
        this._settingsChangedHandlerId = this._settings.connect(`changed`, (...[, key]) => {
            switch (key) {
                case this._keyShowSuspendButton: {
                    this.notify(`showSuspendButton`);
                    break;
                }
                default:
                    break;
            }
        });
    }

    destroy() {
        this._settings.disconnect(this._settingsChangedHandlerId);
    }

    get showSuspendButton() {
        return this._settings.get_boolean(this._keyShowSuspendButton);
    }

    set showSuspendButton(showSuspendButton) {
        this._settings.set_boolean(this._keyShowSuspendButton, showSuspendButton);
    }
});
