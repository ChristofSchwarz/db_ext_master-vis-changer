define(["qlik", "jquery", "./props", "./functions"], function (qlik, $, props, functions) {

    'use strict';

    var vsettings = {};
    var qext;

    $.ajax({
        url: '../extensions/db_ext_VisChanger/db_ext_VisChanger.qext',
        dataType: 'json',
        async: false,  // wait for this call to finish.
        success: function (data) { qext = data; }
    });

    return {
        initialProperties: {
            showTitles: false,
            disableNavMenu: false,
        },

        definition: {
            type: "items",
            component: "accordion",
            items: [
                {
                    uses: "settings"
                }, {
                    label: 'Extension Settings',
                    type: 'items',
                    items: props.presentation(qlik.currApp(this))
                }, {
                    label: 'About this extension',
                    type: 'items',
                    items: props.about(qext)
                }
            ]
        },
        snapshot: {
            canTakeSnapshot: false
        },

        // updateData: function (layout) {
        //     return qlik.Promise.resolve();
        // },

        resize: function ($element, layout) {
            var self = this;
            const ownId = this.options.id;
            const mode = qlik.navigation.getMode();
            if (layout.pConsoleLog) console.log(ownId, 'resize', 'mode ' + mode, 'layout', layout);
            if (mode == 'edit') $('#' + ownId + '_edit').show();
            if (mode == 'analysis') $('#' + ownId + '_edit').hide();

            functions.moreHeightForCheckboxes(ownId, layout.pGroupCheckboxes);

            return qlik.Promise.resolve();
        },

        paint: function ($element, layout) {

            var self = this;
            const ownId = this.options.id;
            const mode = qlik.navigation.getMode();
            if (layout.pConsoleLog) console.log(ownId, 'paint', 'mode ' + mode, 'layout', layout);
            const app = qlik.currApp(this);
            const thisSheetId = qlik.navigation.getCurrentSheetId().sheetId;
            const enigma = app.model.enigmaModel;
            const lStorageKey = app.id + '|' + ownId;


            // turn off (white) bg color of this object
            if (layout.pNoBkgr) {
                $('[tid="' + ownId + '"] .qv-inner-object').css('background-color', 'argb(0,0,0,0)');
                $('[tid="' + ownId + '"] .qv-object').css('border-width', '0px');
            }

            $element.html(
                '<div id="parent_' + ownId + '" style="height:100%;position:relative;">' +
                '   <button style="position: absolute;z-index: 300;background-color:rgba(255,255,255,0.8);width: 120px;left: calc(50% - 60px);display:none;"' +
                '       class="lui-button" id="' + ownId + '_edit">Edit Chart</button>' +
                '	<img src="../extensions/db_ext_VisChanger/pics/loader.gif" id="' + ownId + '_loader"' +
                '		style="width:250px;height:250px;position:absolute;z-index:200;left:calc(50% - 125px);top:calc(50% - 135px);"></img>	' +
                '   <div id="' + ownId + '_databridge" ' +
                '      style="width:250px;height: 20px;position:absolute;z-index:201;left:calc(50% - 125px);top: 50%;color: grey;text-align: center;font-weight: bold;">data/\\bridge</div>' +
                '	<div id="vis_' + ownId + '" style="height:calc(100% - 25px);"></div>' +
                '</div>');

            if (mode == 'edit' && layout.pMasterObjectId != '') $('#' + ownId + '_edit').show();
            if (mode == 'analysis' || layout.pMasterObjectId == '') $('#' + ownId + '_edit').hide();

            $('#' + ownId + '_edit').click(function () {
                // try to open the master elements editor with DOM triggers
                function activateMasterVis() {
                    $('[tid="accordion-header-visualization"]').trigger('click');
                    setTimeout(function () {
                        // enter the title in search
                        setTimeout(function () {
                            $('[data-tid="search-input"]').val(vsettings[ownId].masterName).trigger('input');
                            $('[data-id="' + layout.pMasterObjectId + '"]').css('background-color', 'yellow').trigger('click');
                            setTimeout(function () {
                                $('[tid="preview-edit-item"]').css('background-color', 'yellow').trigger('qv-activate');
                            }, 300)
                        }, 300)
                    }, 300)
                }
                if ($('[tid="accordion-header-visualization"]').length == 0) {
                    $('[tid="tab_bar_button_library"]').trigger('qv-activate').css('background-color', 'yellow')
                    setTimeout(function () {
                        activateMasterVis();
                    }, 300);
                } else {
                    activateMasterVis();
                }
            })

            const switcher =
                '<div class="lui-switch" style="float:left;">' +
                '    <label class="lui-switch__label">' +
                '        <input type="checkbox" id="switcher_' + ownId + '" class="lui-switch__checkbox" aria-label="Label"/>' +
                '        <span class="lui-switch__wrap">' +
                '            <span class="lui-switch__inner"></span>' +
                '            <span class="lui-switch__switch"></span>' +
                '        </span>' +
                '    </label>' +
                '</div>' +
                '<span>&nbsp;' + layout.pSwitchLabel + '</span>';


            const htmlCheckboxes =
                '<div id="checkboxes_' + ownId + '" ' +
                '        style="height:25px;text-align:' + layout.pAlign + ';' + (layout.pAboveBelow == 'below' ? 'line-height:24px;' : '') + '">' +
                '    <div id="zone1_' + ownId + '" style="display:' + (layout.pGroupCheckboxes ? 'inline-block' : 'none') + ';vertical-align:bottom;">'
                + (layout.pGroupCheckboxes ? switcher : '') + // show switcher 
                '    </div>' +
                '    <div id="zone2_' + ownId + '" style="display:inline-block;margin-left:10px;">' +
                '        <span class="lui-icon  lui-icon--info" id="' + ownId + '_nosibling" style="display:none;color:indianred;" ' +
                '            title="One or more measure has no modified/unmodified sibling."></span>' +
                '    </div>' +
                '</div>';


            if (layout.pAboveBelow == 'above') {
                $('#parent_' + ownId).prepend(htmlCheckboxes);
            } else {
                $('#parent_' + ownId).append(htmlCheckboxes);
            }

            var charts = [];

            enigma.getObject(layout.pMasterObjectId).then((obj) => {

                // get the object first time
                Promise.all([obj.getLayout(), obj.getProperties()])
                    .then(function (res) {
                        const objLayout = res[0];
                        const objProp = res[1];
                        if (layout.pConsoleLog) {
                            console.log(ownId, 'objProp', objProp);
                            console.log(ownId, 'objLayout', objLayout);
                        }

                        if (!vsettings[ownId]) vsettings[ownId] = {
                            masterTitle: objLayout.title,
                            masterName: objProp.qMetaDef.title,
                            checkboxes: { "_showModified": false },
                            siblings: {}
                        };

                        var propCopy1 = JSON.parse(JSON.stringify(objProp)); // make copy of master vis props
                        propCopy1.qHyperCubeDef.qMeasures = []; // empty the measures
                        var lStorage = {};
                        try {
                            if (layout.pLocalStorage && window.localStorage.getItem(lStorageKey))
                                lStorage = JSON.parse(window.localStorage.getItem(lStorageKey));
                            if (lStorage._showModified) {
                                $('#switcher_' + ownId).prop('checked', true);
                                vsettings[ownId].checkboxes._showModified = true;
                            }
                        } catch (err) { }

                        if (layout.pConsoleLog) console.log(ownId, 'in Local storage found', lStorage);
                        var m = -1;
                        var measStruct = {};
                        vsettings[ownId].siblings = {};
                        for (const qMeasure of objProp.qHyperCubeDef.qMeasures) {
                            m++;
                            const mId = qMeasure.qDef.cId;

                            var formulaHash = '';
                            var hasModifier = false;
                            if (qMeasure.qDef.base) {
                                // the measure uses a modifer (e.g. accumulation)
                                formulaHash = (qMeasure.qDef.base.qLibraryId && qMeasure.qDef.base.qLibraryId.length > 0) ?
                                    qMeasure.qDef.base.qLibraryId : functions.hash(qMeasure.qDef.base.qDef);
                                hasModifier = true;
                                //console.log(m, 'has modifier', formulaHash, qMeasure );
                            } else {
                                // the measure is a normal one (no modifier)
                                formulaHash = (qMeasure.qLibraryId && qMeasure.qLibraryId.length > 0) ?
                                    qMeasure.qLibraryId : functions.hash(qMeasure.qDef.qDef);
                                //console.log(m, 'no mod', formulaHash, qMeasure );
                            }
                            if (measStruct[formulaHash]) {
                                measStruct[formulaHash].push(mId);
                            } else {
                                measStruct[formulaHash] = [mId];
                            }


                            if (!vsettings[ownId].checkboxes[mId]) {
                                // no value yet in the vsettings for the current checkbox? Add it .. 
                                vsettings[ownId].checkboxes[mId] = lStorage.hasOwnProperty(mId) ? lStorage[mId] : true;
                            }


                            $('#' + ownId + '_' + mId + '_parent').remove(); // if this label has been rendered in DOM before, remove it
                            // get label of measure and render checkbox
                            $('#zone2_' + ownId).append(
                                '  <label class="lui-checkbox  ' + (hasModifier ? 'modified' : 'unmodified') + '"' +
                                '    style="' + (hasModifier && layout.pGroupCheckboxes ? 'display:none;' : 'display:inline;') +
                                '        margin-right:12px;margin-bottom:5px;"' +
                                '    id="' + ownId + '_' + mId + '_parent">' +
                                '    <input class="lui-checkbox__input" type="checkbox" aria-label="Label" id="' + ownId + '_inp_' + mId + '"'
                                + (vsettings[ownId].checkboxes[mId] ? 'checked' : '') + ' />' +
                                '    <div class="lui-checkbox__check-wrap">' +
                                '        <span class="lui-checkbox__check"></span>' +
                                '        <span class="lui-checkbox__check-text" id="' + ownId + '_meas_lbl' + mId + '">'
                                + objLayout.qHyperCube.qMeasureInfo[m].qFallbackTitle + '</span>' +
                                '    </div>' +
                                '</label>');

                            // figure out if the current measure should be rendered. 
                            const isChecked = vsettings[ownId].checkboxes[mId];
                            const showModified = $('#switcher_' + ownId).is(':checked');

                            functions.toggleShowCheckboxes(showModified, ownId, vsettings, layout.pGroupCheckboxes);

                            const renderThisMeas = (layout.pGroupCheckboxes ? (isChecked && hasModifier == showModified) : isChecked);
                            if (renderThisMeas) {
                                //propCopy1.qHyperCubeDef.qMeasures.push(objProp.qHyperCubeDef.qMeasures[m]);
                                propCopy1.qHyperCubeDef.qMeasures = propCopy1.qHyperCubeDef.qMeasures.concat(
                                    objProp.qHyperCubeDef.qMeasures.filter(function (qMeasure) { return qMeasure.qDef.cId == mId }));
                            }
                        }

                        // create siblings object from the measStruct object
                        for (var mS in measStruct) {

                            measStruct[mS].forEach(function (e) {
                                vsettings[ownId].siblings[e] = measStruct[mS].filter(function (l) { return l != e });
                            })
                        }
                        if (layout.pConsoleLog) console.log('Siblings', vsettings[ownId].siblings);

                        // count such measures which have no sibling. 
                        var unbalanced = 0;
                        for (var mS in vsettings[ownId].siblings) {
                            if (vsettings[ownId].siblings[mS].length == 0) unbalanced++;
                        }
                        // if there are measures without a sibling, show the warning
                        if (unbalanced > 0 && layout.pGroupCheckboxes) {
                            $('#' + ownId + '_nosibling').show();
                        } else {
                            $('#' + ownId + '_nosibling').hide();
                        }


                        // more height needed for checkboxes?
                        functions.moreHeightForCheckboxes(ownId, layout.pGroupCheckboxes);

                        // register on-change event at the listboxes
                        $('#zone2_' + ownId + ' .lui-checkbox__input').change(function (domObj) {

                            console.log('Clicked on obj', domObj.target.id, $('#' + domObj.target.id).is(':checked'));
                            const id = domObj.target.id.split('_')[2];
                            const isChecked = $('#' + domObj.target.id).is(':checked');
                            const alsoChange = vsettings[ownId].siblings[id];
                            if (alsoChange && layout.pGroupCheckboxes) alsoChange.forEach(function (chgId) {
                                $('#' + ownId + '_inp_' + chgId).prop('checked', isChecked);
                            });
                            console.log('also Change', alsoChange);
                            functions.handleOnChange(objProp, app, enigma, charts, ownId, layout, vsettings, lStorageKey);

                        });

                        // register on-change event at the switcher
                        $('#switcher_' + ownId).change(function (domObj) {
                            const showModified = $('#switcher_' + ownId).is(':checked');
                            functions.toggleShowCheckboxes(showModified, ownId, vsettings, layout.pGroupCheckboxes);
                            functions.handleOnChange(objProp, app, enigma, charts, ownId, layout, vsettings, lStorageKey);
                        })

                        if (layout.pConsoleLog) console.log('vsettings[' + ownId + ']', vsettings[ownId]);
                        functions.drawChart(propCopy1, app, enigma, charts, ownId, layout.pConsolelog);

                    })

            }).catch(function (err) {
                console.error(err);
            });

            return qlik.Promise.resolve();
        }
    };
});