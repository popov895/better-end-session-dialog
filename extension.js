'use strict';

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import { EndSessionDialog } from 'resource:///org/gnome/shell/ui/endSessionDialog.js';
import { Extension, InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const _ = (text, context, domain = `gnome-shell`) => {
    return context ? GLib.dpgettext2(domain, context, text) : GLib.dgettext(domain, text);
};

export default class extends Extension {
    enable() {
        this._injectionManager = new InjectionManager();
        this._injectionManager.overrideMethod(EndSessionDialog.prototype, `_updateButtons`, () => {
            return function () {
                this.clearButtons();

                const addButton = (buttonInfo) => {
                    const button = this.addButton(buttonInfo);
                    if (buttonInfo.setKeyFocus) {
                        this.setInitialKeyFocus(button);
                    }
                    return button;
                };

                addButton({
                    label: _(`Cancel`),
                    key: Clutter.KEY_Escape,
                    action: this.cancel.bind(this),
                });

                if (Main.sessionMode.currentMode === `user` || Main.sessionMode.parentMode === `user`) {
                    addButton({
                        label: _(`Log Out`, `button`),
                        setKeyFocus: this._type === 0,
                        action: () => {
                            const signalId = this.connect(`closed`, () => {
                                this.disconnect(signalId);
                                this._confirm(`ConfirmedLogout`).catch(logError);
                            });
                            this.close(true);
                        },
                    });
                }

                const rebootAndInstall = this._pkOfflineProxy && (this._updateInfo.UpdateTriggered || this._updateInfo.UpgradeTriggered);
                this._rebootButton = addButton({
                    label: rebootAndInstall ? _(`Restart &amp; Install`, `button`) : _(`Restart`, `button`),
                    setKeyFocus: this._type >= 2 && this._type <= 4,
                    action: () => {
                        const signalId = this.connect(`closed`, () => {
                            this.disconnect(signalId);
                            this._confirm(`ConfirmedReboot`).catch(logError);
                        });
                        this.close(true);
                    },
                });

                if (this._canRebootToBootLoaderMenu) {
                    this._rebootButtonAlt = addButton({
                        label: _(`Boot Options`, `button`),
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

                addButton({
                    label: _(`Power Off`, `button`),
                    setKeyFocus: this._type === 1,
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
