define(["qlik", "jquery", "./props"], function (qlik, $, props) {

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

        resize: function ($element, layout) {
            var self = this;
            const ownId = this.options.id;
            const mode = qlik.navigation.getMode();
            if (layout.pConsoleLog) console.log(ownId, `mode ${mode}, layout`, layout);
            if (mode == 'edit') $(`#${ownId}_edit`).show();
            if (mode == 'analysis') $(`#${ownId}_edit`).hide();

            // more height needed for checkboxes?
            const morePx = $(`#checkboxes_${ownId} label`).last().position().top - $(`#checkboxes_${ownId} label`).first().position().top;
            $(`#checkboxes_${ownId}`).css('height', 25 + morePx);
            $(`#vis_${ownId}`).css('height', `calc(100% - ${25 + morePx}px)`);
            return qlik.Promise.resolve();
        },

        paint: function ($element, layout) {

            var self = this;
            const ownId = this.options.id;
            const mode = qlik.navigation.getMode();
            if (layout.pConsoleLog) console.log(ownId, `mode ${mode}, layout`, layout);
            const app = qlik.currApp(this);
            const thisSheetId = qlik.navigation.getCurrentSheetId().sheetId;
            const enigma = app.model.enigmaModel;


            // turn off (white) bg color of this object
            $(`[tid="${ownId}"] .qv-inner-object`).css('background-color', layout.pNoBkgr ? 'argb(0,0,0,0)' : '');
            $(`[tid="${ownId}"] .qv-object`).css('border-width', layout.pNoBkgr ? '0px' : '');

            $element.html(`
				<div id="parent_${ownId}" style="height:100%;position:relative;">
					<button style="position: absolute;z-index: 300;background-color:rgba(255,255,255,0.8);width: 120px;left: calc(50% - 60px);display:none;" 
						class="lui-button" id="${ownId}_edit">Edit Chart</button>
					<div id="vis_${ownId}" style="height:calc(100% - 25px);"></div>
				</div>`);
            if (mode == 'edit') $(`#${ownId}_edit`).show();
            if (mode == 'analysis') $(`#${ownId}_edit`).hide();
            $(`#${ownId}_edit`).click(() => {
                // try to open the master elements editor with DOM triggers
                if ($('[tid="accordion-header-visualization"]').length == 0) {
                    $('[tid="tab_bar_button_library"]').css('background-color', 'yellow');
                } else {

                    $('[tid="accordion-header-visualization"]').trigger('click');
                    setTimeout(() => {
                        if ($(`[data-id="${layout.pMasterObjectId}"]`).length == 0) {
                            // visualization is not in scroll page. help the developer by entering the title in search
                            $('[data-tid="search-input"]').val(vsettings[ownId].masterTitle);
                            $('[data-tid="search-input"]').css('background-color', 'yellow');
                        } else {
                            $(`[data-id="${layout.pMasterObjectId}"]`).css('background-color', 'yellow').trigger('click');
                            setTimeout(() => {
                                $('[tid="preview-edit-item"]').css('background-color', 'yellow');
                            }, 200)
                        }
                    }, 200)

                }
            })

            const htmlCheckboxes = `<div id="checkboxes_${ownId}" 
				style="height:25px;text-align:${layout.pAlign};line-height:24px;"></div>`;
            if (layout.pAboveBelow == 'above') {
                $(`#parent_${ownId}`).prepend(htmlCheckboxes);
            } else {
                $(`#parent_${ownId}`).append(htmlCheckboxes);
            }

            var charts = [];

            function drawChart(chartProp) {
                if (layout.pConsoleLog) console.log(ownId, 'calling drawChart', chartProp);
                if (chartProp.qInfo) delete chartProp.qInfo; // remove certain keys form the object
                if (chartProp.qMetaDef) delete chartProp.qMetaDef;

                if (charts.length > 0) {
                    if (layout.pConsoleLog) console.log(ownId, 'closing chart ' + (charts.length - 1), charts[charts.length - 1].id);
                    charts[charts.length - 1].close();
                    enigma.destroySessionObject(charts[charts.length - 1].id);
                    charts.shift();
                }
				

                app.visualization.create(chartProp.visualization, null, chartProp).then(function (chart) {
                    charts.push(chart);
                    charts[charts.length - 1].show(`vis_${ownId + (charts.length>1 ? '_2': '')}`); //`${ownId}${rand}`);
                    if (layout.pConsoleLog) console.log(ownId, 'charts', charts);
					
					/*if (charts.length > 1) {
						setTimeout(()=>{
							if (layout.pConsoleLog) console.log(ownId, 'closing chart ' + (charts.length - 2), charts[charts.length - 2].id);
							charts[charts.length - 2].close();
							enigma.destroySessionObject(charts[charts.length - 2].id);
							charts.shift();
						}, 500)
					}
					*/
					
                }).catch(function (err) {
                    console.error(err);
                });
            }

            Promise.all([enigma.getObject(layout.pMasterObjectId), enigma.getProperties(layout.pMasterObjectId)]).then(
                function (res) {
                    console.log('P.all', res);
                }
            )

            enigma.getObject(layout.pMasterObjectId).then((obj) => {

                Promise.all([obj.getLayout(), obj.getProperties()])
                    .then(function (res) {
                        const objLayout = res[0];
                        const objProp = res[1];
                        if (layout.pConsoleLog) {
                            console.log(ownId, 'objProp', objProp);
                            console.log(ownId, 'objLayout', objLayout);
                        }
                        if (!vsettings[ownId]) vsettings[ownId] = { masterTitle: objProp.title, checkboxes: [] };

                        var propCopy1 = JSON.parse(JSON.stringify(objProp)); // make copy of master vis props
                        propCopy1.qHyperCubeDef.qMeasures = []; // empty the measures

                        var m = -1;
                        for (const qMeasure of objProp.qHyperCubeDef.qMeasures) {
                            m++;
                            //console.log(m, qMeasure);
							//console.log(m, objLayout.qHyperCube.qMeasureInfo[m].qFallbackTitle);

                            if (vsettings[ownId].checkboxes.length <= m) vsettings[ownId].checkboxes.push(true);
                            // get label of measure

                            $(`#checkboxes_${ownId}`).append(`
                            <label class="lui-checkbox" style="display:inline;margin-right:12px;margin-bottom:5px;">
                                <input class="lui-checkbox__input" type="checkbox" aria-label="Label" id="${ownId}_meas${m}" ${vsettings[ownId].checkboxes[m] ? 'checked' : ''} />
                                <div class="lui-checkbox__check-wrap">
                                    <span class="lui-checkbox__check"></span>
                                    <span class="lui-checkbox__check-text" id="${ownId}_meas_lbl${m}">${objLayout.qHyperCube.qMeasureInfo[m].qFallbackTitle}</span>
                                </div>
                            </label>`);

                            if (vsettings[ownId].checkboxes[m]) {
                                propCopy1.qHyperCubeDef.qMeasures.push(objProp.qHyperCubeDef.qMeasures[m]);
                            }
                        }
                        // more height needed for checkboxes?
                        const morePx = $(`#checkboxes_${ownId} label`).last().position().top - $(`#checkboxes_${ownId} label`).first().position().top;
                        $(`#checkboxes_${ownId}`).css('height', 25 + morePx);
                        $(`#vis_${ownId}`).css('height', `calc(100% - ${25 + morePx}px)`);

                        // register on-change event at the listboxes

                        $(`#checkboxes_${ownId} .lui-checkbox__input`).change(function (obj) {
                            var propCopy2 = JSON.parse(JSON.stringify(objProp)); // make copy of master vis props
                            propCopy2.qHyperCubeDef.qMeasures = []; // empty the measures
                            // copy such measures where the checkbox is checked
                            for (let n = 0; n <= m; n++) {
                                if ($(`#${ownId}_meas${n}`).is(':checked')) {
                                    propCopy2.qHyperCubeDef.qMeasures.push(objProp.qHyperCubeDef.qMeasures[n]);
                                    vsettings[ownId].checkboxes[n] = true;
                                } else {
                                    vsettings[ownId].checkboxes[n] = false;
                                }
                            }
                            console.log('vsettings', vsettings);
                            drawChart(propCopy2);
                        });

                        console.log('vsettings', vsettings);
                        drawChart(propCopy1);

                    })

            }).catch(function (err) {
                console.error(err);
            });

            return qlik.Promise.resolve();
        }
    };
});
