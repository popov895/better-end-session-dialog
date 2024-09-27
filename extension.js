'use strict';

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as SystemActions from 'resource:///org/gnome/shell/misc/systemActions.js';

import { EndSessionDialog } from 'resource:///org/gnome/shell/ui/endSessionDialog.js';
import { Extension, InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js';

import { Preferences } from './lib/preferences.js';
import { _, logError } from './lib/utils.js';

const LoginManagerProxy = Gio.DBusProxy.makeProxyWrapper(`
    <node>
        <interface name="org.freedesktop.login1.Manager">
            <method name="Hibernate">
                <arg type="b" direction="in"/>
            </method>
            <method name="CanHibernate">
                <arg type="s" direction="out"/>
            </method>
        </interface>
    </node>
`);

class LoginManager {
    constructor() {
        this._proxy = new LoginManagerProxy(
            Gio.DBus.system,
            `org.freedesktop.login1`,
            `/org/freedesktop/login1`,
            (proxy, error) => {
                if (error) {
                    logError(`Failed to connect to the ${proxy.g_interface_name} D-Bus interface`, error);
                } else {
                    proxy.CanHibernateRemote((result, error) => {
                        if (error) {
                            logError(`Failed to call the CanHibernate method of the ${proxy.g_interface_name} D-Bus interface`, error);
                        } else {
                            this._canHibernate = [`yes`, `challenge`].includes(result[0]);
                        }
                    });
                }
            }
        );
    }

    get canHibernate() {
        return this._canHibernate ?? false;
    }

    hibernate() {
        if (!this.canHibernate) {
            return;
        }

        this._proxy.HibernateRemote(true, (...[, error]) => {
            if (error) {
                logError(`Failed to call the Hibernate method of the ${this._proxy.g_interface_name} D-Bus interface`, error);
            }
        });
    }
}

export default class extends Extension {
    enable() {
        this._preferences = new Preferences(this);
        if (this._preferences.showHibernateButton) {
            this._loginManager = new LoginManager();
        } else {
            this._preferences.connectObject(`notify::showHibernateButton`, () => {
                if (this._preferences.showHibernateButton) {
                    this._preferences.disconnectObject(this);
                    this._loginManager = new LoginManager();
                }
            }, this);
        }

        const extension = this;

        this._injectionManager = new InjectionManager();
        this._injectionManager.overrideMethod(EndSessionDialog.prototype, `_updateButtons`, () => {
            return function () {
                this.clearButtons();

                const systemActions = SystemActions.getDefault();

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

                if (extension._preferences.showHibernateButton && extension._loginManager.canHibernate && systemActions.canSuspend) {
                    addButton({
                        label: _(`Hibernate`, `button`),
                        action: () => {
                            const signalId = this.connect(`closed`, () => {
                                this.disconnect(signalId);
                                extension._loginManager.hibernate();
                            });
                            this.cancel();
                        },
                    });
                }

                if (extension._preferences.showSuspendButton && systemActions.canSuspend) {
                    addButton({
                        label: _(`Suspend`, `button`),
                        action: () => {
                            const signalId = this.connect(`closed`, () => {
                                this.disconnect(signalId);
                                systemActions.activateSuspend();
                            });
                            this.cancel();
                        },
                    });
                }

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

        delete this._loginManager;

        this._preferences.disconnectObject(this);
        this._preferences.destroy();
        delete this._preferences;
    }
}
