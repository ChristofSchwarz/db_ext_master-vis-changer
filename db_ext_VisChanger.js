define(["qlik", "jquery", "./props"], function (qlik, $, props) {

    'use strict';

	var vsettings = {};
	var qext;
	
	$.ajax({
	  url: '../extensions/db_ext_VisChanger/db_ext_VisChanger.qext',
	  dataType: 'json',
	  async: false,  // wait for this call to finish.
	  success: function(data) { qext = data; }
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
            // nothing to do when only resized
            return qlik.Promise.resolve();
        },

        paint: function ($element, layout) {

            var self = this;
            const ownId = this.options.id;
            if (layout.pConsoleLog) console.log(ownId, 'layout', layout);
			const app = qlik.currApp(this);
            const thisSheetId = qlik.navigation.getCurrentSheetId().sheetId;
            const enigma = app.model.enigmaModel;


            // turn off (white) bg color of this object
            $(`[tid="${ownId}"] .qv-inner-object`).css('background-color', layout.pNoBkgr ? 'argb(0,0,0,0)' : '');
            $(`[tid="${ownId}"] .qv-object`).css('border-width', layout.pNoBkgr ? '0px' : '');

            $element.html(`
				<div id="parent_${ownId}" style="height:100%;position:relative;">
					<div id="vis_${ownId}" style="height:calc(100% - 25px);"></div>
				</div>`);
			
			const htmlCheckboxes = `<div id="checkboxes_${ownId}" 
				style="height:25px;text-align:${layout.pAlign};margin-top:${layout.pAboveBelow=='below' ? '4px' : '0'};"></div>`;
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
                    charts[charts.length - 1].show(`vis_${ownId}`); //`${ownId}${rand}`);
                    if (layout.pConsoleLog) console.log(ownId, 'charts', charts);
                }).catch(function (err) {
                    console.error(err);
                });
            }

            enigma.getObject(layout.pMasterObjectId).then((myVizObj) => {
                return myVizObj.getProperties();
            }).then((myVizObjProp) => {
                if (layout.pConsoleLog) console.log(ownId, 'myVizObjProp', myVizObjProp);
				if (!vsettings[ownId]) vsettings[ownId] = [];
				var propCopy1 = JSON.parse(JSON.stringify(myVizObjProp)); // make copy of master vis props
				propCopy1.qHyperCubeDef.qMeasures = []; // empty the measures
				
                var m = -1;
                for (const qMeasure of myVizObjProp.qHyperCubeDef.qMeasures) {
                    m++;
                    //console.log(i, qMeasure);
					if (vsettings[ownId].length <= m) vsettings[ownId].push(true);
                    $(`#checkboxes_${ownId}`).append(`
                            <label class="lui-checkbox" style="display:inline;margin-right:12px;margin-bottom:5px;">
                                <input class="lui-checkbox__input" type="checkbox" aria-label="Label" id="${ownId}_meas${m}" ${vsettings[ownId][m] ? 'checked' : ''} />
                                <div class="lui-checkbox__check-wrap">
                                    <span class="lui-checkbox__check"></span>
                                    <span class="lui-checkbox__check-text">${qMeasure.qDef.qLabel}</span>
                                </div>
                            </label>`);
							
					if (vsettings[ownId][m]) {
						propCopy1.qHyperCubeDef.qMeasures.push(myVizObjProp.qHyperCubeDef.qMeasures[m]);
					} 
                }
				
                // register on-change event at the listboxes

                $(`#checkboxes_${ownId} .lui-checkbox__input`).change(function (obj) {
                    var propCopy2 = JSON.parse(JSON.stringify(myVizObjProp)); // make copy of master vis props
                    propCopy2.qHyperCubeDef.qMeasures = []; // empty the measures
                    // copy such measures where the checkbox is checked
                    for (let n = 0; n <= m; n++) {
                        if ($(`#${ownId}_meas${n}`).is(':checked')) {
                            propCopy2.qHyperCubeDef.qMeasures.push(myVizObjProp.qHyperCubeDef.qMeasures[n]);
							vsettings[ownId][n] = true;
						} else {
							vsettings[ownId][n] = false;
						}
                    }
					console.log('vsettings', vsettings);
                    drawChart(propCopy2);
                });
				
				console.log('vsettings', vsettings);
                drawChart(propCopy1);

            }).catch(function (err) {
                console.error(err);
            });

            return qlik.Promise.resolve();
        }
    };
});