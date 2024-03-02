'use strict';

const { Clutter } = imports.gi;

const EndSessionDialog = imports.ui.endSessionDialog.EndSessionDialog;

const ExtensionUtils = imports.misc.extensionUtils;
const _ = ExtensionUtils.gettext;

class Extension {
    enable() {
        this._originUpdateButtonsFunc = EndSessionDialog.prototype._updateButtons;
        EndSessionDialog.prototype._updateButtons = function () {
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
                        this._confirm(`ConfirmedLogout`);
                    });
                    this.close(true);
                },
            });

            const rebootAndInstall = this._pkOfflineProxy && (this._updateInfo.UpdateTriggered || this._updateInfo.UpgradeTriggered);
            this._rebootButton = this.addButton({
                label: rebootAndInstall ? _(`Restart &amp; Install`) : _(`Restart`),
                action: () => {
                    const signalId = this.connect(`closed`, () => {
                        this.disconnect(signalId);
                        this._confirm(`ConfirmedReboot`);
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
                        this._confirm(`ConfirmedShutdown`);
                    });
                    this.close(true);
                },
            });
        };
    }

    disable() {
        EndSessionDialog.prototype._updateButtons = this._originUpdateButtonsFunc;
        delete this._originUpdateButtonsFunc;
    }
}

var init = () => {
    ExtensionUtils.initTranslations(ExtensionUtils.getCurrentExtension().uuid);

    return new Extension();
};
