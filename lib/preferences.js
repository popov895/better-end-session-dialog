'use strict';

import GObject from 'gi://GObject';

export const Preferences = GObject.registerClass(
class Preferences extends GObject.Object {
    static [GObject.GTypeName] = `BetterEndSessionDialog_Preferences`;

    static [GObject.properties] = {
        'showSuspendButton': GObject.ParamSpec.boolean(
            `showSuspendButton`, ``, ``,
            GObject.ParamFlags.READWRITE,
            false
        ),
        'showHibernateButton': GObject.ParamSpec.boolean(
            `showHibernateButton`, ``, ``,
            GObject.ParamFlags.READWRITE,
            false
        ),
    };

    constructor(extension) {
        super();

        this._keyShowSuspendButton = `show-suspend-button`;
        this._keyShowHibernateButton = `show-hibernate-button`;

        this._settings = extension.getSettings();
        this._settingsChangedHandlerId = this._settings.connect(`changed`, (...[, key]) => {
            switch (key) {
                case this._keyShowSuspendButton: {
                    this.notify(`showSuspendButton`);
                    break;
                }
                case this._keyShowHibernateButton: {
                    this.notify(`showHibernateButton`);
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

    get showHibernateButton() {
        return this._settings.get_boolean(this._keyShowHibernateButton);
    }

    set showHibernateButton(showHibernateButton) {
        this._settings.set_boolean(this._keyShowHibernateButton, showHibernateButton);
    }
});
