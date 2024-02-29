'use strict';

import Clutter from 'gi://Clutter';

import { EndSessionDialog } from 'resource:///org/gnome/shell/ui/endSessionDialog.js';
import { Extension, InjectionManager, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class extends Extension {
    constructor(metadata) {
        super(metadata);

        this._injectionManager = new InjectionManager();
    }

    enable() {
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
                        this.close(true);
                        const signalId = this.connect(`closed`, () => {
                            this.disconnect(signalId);
                            this._confirm(`ConfirmedLogout`);
                        });
                    },
                });

                const rebootButton = this.addButton({
                    label: _(`Restart`),
                    action: () => {
                        this.close(true);
                        const signalId = this.connect(`closed`, () => {
                            this.disconnect(signalId);
                            this._confirm(`ConfirmedReboot`);
                        });
                    },
                });

                if (this._canRebootToBootLoaderMenu) {
                    this._rebootButton = rebootButton;
                    this._rebootButtonAlt = this.addButton({
                        label: _(`Boot Options`),
                        action: () => {
                            this.close(true);
                            const signalId = this.connect(`closed`, () => {
                                this.disconnect(signalId);
                                this._confirmRebootToBootLoaderMenu();
                            });
                        },
                    });
                    this._rebootButtonAlt.visible = false;
                    this._capturedEventId = this.connect(`captured-event`, this._onCapturedEvent.bind(this));
                }

                this.addButton({
                    label: _(`Power Off`),
                    action: () => {
                        this.close(true);
                        const signalId = this.connect(`closed`, () => {
                            this.disconnect(signalId);
                            this._confirm(`ConfirmedShutdown`);
                        });
                    },
                });
            };
        });
    }

    disable() {
        this._injectionManager.clear();
    }
}
