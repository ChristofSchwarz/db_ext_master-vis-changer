// externalized functions
define(["jquery"], function ($) {

    function drawChart(chartProp, app, enigma, charts, ownId, pConsoleLog) {
        if (pConsoleLog) console.log(ownId, 'calling drawChart', chartProp);
        if (chartProp.qInfo) delete chartProp.qInfo; // remove certain keys form the object
        if (chartProp.qMetaDef) delete chartProp.qMetaDef;

        if (charts.length > 0) {
            if (pConsoleLog) console.log(ownId, 'closing chart ' + (charts.length - 1), charts[charts.length - 1].id);
            charts[charts.length - 1].close();
            enigma.destroySessionObject(charts[charts.length - 1].id);
            charts.shift();
        }


        app.visualization.create(chartProp.visualization, null, chartProp)
		.then(function (chart) {
            charts.push(chart);
            charts[charts.length - 1].show('vis_' + ownId); 
            $('#' + ownId + '_loader').fadeOut(500, function(){  
				$('#' + ownId + '_loader').hide();
			});
			$('#' + ownId + '_databridge').fadeOut(500, function(){  
				$('#' + ownId + '_loader').hide();
			});
            charts.shift();

        }).catch(function (err) {
            console.error(err);
        });
    }

    return {

        drawChart: function (chartProp, app, enigma, charts, ownId, pConsoleLog) {
            drawChart(chartProp, app, enigma, charts, ownId, pConsoleLog)
        },

        hash: function (s) {
			// returns a hash-number for a given string s
            var x = 0;
            for (var j = 0; j < s.length; j++) {
                x = ((x << 5) - x) + s.charCodeAt(j)
                x |= 0;
            }
            return x;
        },

        moreHeightForCheckboxes: function (ownId, hasZone1) {
            // adjusts the height of the checkboxes_#### div by checking if the last element is in another distance from top
            var first;
            const last = $('#zone2_' + ownId + ' label').filter(function () { return $(this).css('display') != 'none'; }).last().position();
            if (hasZone1) {
                first = $('#zone1_' + ownId).position();
            } else {
                first = $('#zone2_' + ownId + ' label').filter(function () { return $(this).css('display') != 'none'; }).first().position();
            }
            const morePx = last ? Math.max(0, last.top - first.top) : 0;
            $('#checkboxes_' + ownId).css('height', 25 + morePx);
            $('#vis_' + ownId).css('height', 'calc(100% - ' + (25 - morePx) + 'px)');
        },


        toggleShowCheckboxes: function (showModified, ownId, vsettings, groupMode) {
			if (groupMode) {
				// shows the checkboxes with "modified" class and hides the ones with "unmodified" class or other way around.
				if (showModified) {
					$('#zone2_' + ownId + ' .modified').css('display', 'inline');
					$('#zone2_' + ownId + ' .unmodified').css('display', 'none');
					vsettings[ownId].checkboxes['_showModified'] = true;
				} else {
					$('#zone2_' + ownId + ' .modified').css('display', 'none');
					$('#zone2_' + ownId + ' .unmodified').css('display', 'inline');
					vsettings[ownId].checkboxes['_showModified'] = false;
				}
			} 
        },

        handleOnChange: function (objProp, app, enigma, charts, ownId, layout, vsettings, lStorageKey) {
            $(`#${ownId}_loader`).show();
			$(`#${ownId}_databridge`).show();
            var propCopy2 = JSON.parse(JSON.stringify(objProp)); // make copy of master vis props
            propCopy2.qHyperCubeDef.qMeasures = []; // empty the measures
            const showModified = $('#switcher_' + ownId).is(':checked');
            //vsettings[ownId].checkboxes['_showModified'] = true;
            if (layout.pConsoleLog) console.log('vsettings[' + ownId + '].checkboxes', vsettings[ownId].checkboxes);
			
            // copy such measures where the checkbox is checked
            for (const mId in vsettings[ownId].checkboxes) {
                const isChecked = $('#' + ownId + '_inp_' + mId).is(':checked');
                vsettings[ownId].checkboxes[mId] = isChecked;
                const hasModifier = $('#' + ownId + '_inp_' + mId).parent().hasClass('modified');

                if (layout.pGroupCheckboxes ? (isChecked && hasModifier == showModified) : isChecked) {
                    // copy the measure from original objProp which is found under the cId
                    propCopy2.qHyperCubeDef.qMeasures = propCopy2.qHyperCubeDef.qMeasures.concat(
                        objProp.qHyperCubeDef.qMeasures.filter(function (qMeasure) { return qMeasure.qDef.cId == mId }));
                    //vsettings[ownId].checkboxes[mId] = true;
                } else {
                    //vsettings[ownId].checkboxes[mId] = false;
                }		
            }
            vsettings[ownId].checkboxes._showModified = showModified;

            if (layout.pLocalStorage) {
                window.localStorage.setItem(lStorageKey, JSON.stringify(vsettings[ownId].checkboxes));
                if (layout.pConsoleLog) console.log(ownId, '>>> saved to localStorage', window.localStorage.getItem(lStorageKey));
            }
            drawChart(propCopy2, app, enigma, charts, ownId, layout.pConsolelog);
        }
    }
});
