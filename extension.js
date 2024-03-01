'use strict';

import Clutter from 'gi://Clutter';

import { EndSessionDialog } from 'resource:///org/gnome/shell/ui/endSessionDialog.js';
import { Extension, InjectionManager, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class extends Extension {
    enable() {
        this._injectionManager = new InjectionManager();
        this._injectionManager.overrideMethod(EndSessionDialog.prototype, `_updateButtons`, () => {
            return function () {
                this.clearButtons();

                this.addButton({
                    label: _(`Cancel`),
                    key: Clutter.KEY_Escape,
                    action: this.cancel.bind(this),
                });

                this.addButton({
                    label: _(`Log Out`),
                    action: () => {
                        const signalId = this.connect(`closed`, () => {
                            this.disconnect(signalId);
                            this._confirm(`ConfirmedLogout`).catch(logError);
                        });
                        this.close(true);
                    },
                });

                this._rebootButton = this.addButton({
                    label: _(`Restart`),
                    action: () => {
                        const signalId = this.connect(`closed`, () => {
                            this.disconnect(signalId);
                            this._confirm(`ConfirmedReboot`).catch(logError);
                        });
                        this.close(true);
                    },
                });

                if (this._canRebootToBootLoaderMenu) {
                    this._rebootButtonAlt = this.addButton({
                        label: _(`Boot Options`),
                        action: () => {
                            const signalId = this.connect(`closed`, () => {
                                this.disconnect(signalId);
                                this._confirmRebootToBootLoaderMenu();
                            });
                            this.close(true);
                        },
                    });
                    this._rebootButtonAlt.visible = false;
                    this._capturedEventId = this.connect(`captured-event`, this._onCapturedEvent.bind(this));
                }

                this.addButton({
                    label: _(`Power Off`),
                    action: () => {
                        const signalId = this.connect(`closed`, () => {
                            this.disconnect(signalId);
                            this._confirm(`ConfirmedShutdown`).catch(logError);
                        });
                        this.close(true);
                    },
                });
            };
        });
    }

    disable() {
        this._injectionManager.clear();
        delete this._injectionManager;
    }
}
