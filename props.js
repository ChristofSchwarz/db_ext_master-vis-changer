define(["jquery"], function ($) {
    return {

        presentation: function (app) {
            return [
                 {
                    type: "string",
                    component: "dropdown",
                    label: "Choose master visualization",
                    ref: "pMasterObjectId",
                    options: async function (arg) {
                        const enigma = app.model.enigmaModel;
                        const sessObj = await enigma.createSessionObject({
                            qInfo: {
                                qType: "masterobject",
                            },
                            qAppObjectListDef: {
                                qType: "masterobject",
                                qData: {
                                    name: "/metadata/name",
                                    visualization: "/visualization",
                                    tags: "/metadata/tags"
                                }
                            }
                        });
                        const masterVisList = await sessObj.getLayout();
                        var ret = [];
                        for (const qItem of masterVisList.qAppObjectList.qItems) {
                            ret.push({ value: qItem.qInfo.qId, label: qItem.qData.visualization + ': ' + qItem.qMeta.title })
                        }

                        ret.sort(function (a, b) {
                            return ((a.label < b.label) ? -1 : ((a.label > b.label) ? 1 : 0));
                        });
                        //console.log('Master Visualizations found', ret);
                        return ret;
                    }
                }, {
                    type: "string",
                    defaultValue: "above",
                    ref: "pAboveBelow",
                    label: "Show checkboxes",
                    component: "buttongroup",
                    options: [{
                        value: "above",
                        label: "Above",
                        tooltip: "Above the graphics"
                    }, {
                        value: "below",
                        label: "Below",
                        tooltip: "Below the graphics"
                    }]
                }, {
                    type: "string",
                    defaultValue: "left",
                    ref: "pAlign",
                    label: "Show checkboxes",
                    component: "buttongroup",
                    options: [{
                        value: "left",
                        label: "Left",
                        tooltip: "Left-align the checkboxes"
                    }, {
                        value: "center",
                        label: "Center",
                        tooltip: "Center the checkboxes"
                    }, {
                        value: "right",
                        label: "Right",
                        tooltip: "Right-align the checkboxes"
                    }]
                }, {
                    type: "boolean",
                    defaultValue: false,
                    ref: "pGroupCheckboxes",
                    label: "Group measures with modifiers"
                }, {
                    type: "string",
                    defaultValue: 'Accumulate',
					ref: 'pSwitchLabel',
                    expression: 'optional',
					label: 'Label for switch',
					show: function(arg) {  return arg.pGroupCheckboxes }
                }, {
                    type: "boolean",
                    defaultValue: false,
                    ref: "pNoBkgr",
                    label: "Turn off background"
                }, {
                    type: "boolean",
                    defaultValue: true,
                    ref: "pLocalStorage",
                    label: "Remember user choice in Local Storage"
                }, {
                    label: "See current value", 
					component: "button",
                    action: function (arg) {
                        const lStorageKey = app.id  + '|' + arg.qInfo.qId;
						const content = window.localStorage.getItem(lStorageKey)
							.replace(/":/g, '": ').replace(/,/g, ',\n');
						alert(content);
                    },
					show: function(arg) { 
						const lStorageKey = app.id  + '|' + arg.qInfo.qId;
						return arg.pLocalStorage && window.localStorage.getItem(lStorageKey) 
					}
                }, {
                    type: "boolean",
                    defaultValue: false,
                    ref: "pConsoleLog",
                    label: "console.log debugging info"
                }
            ]
        },

        about: function (qext) {
            return [
                {
                    label: function (arg) { return 'Installed extension version ' + qext.version },
                    component: "link",
                    url: '../extensions/db_ext_VisChanger/db_ext_VisChanger.qext'
                }, {
                    label: "This extension is free of charge by data/\\bridge, Qlik OEM partner and specialist for Mashup integrations.",
                    component: "text"
                }, {
                    label: "Use as is. No support without a maintenance subscription.",
                    component: "text"
                }, {
                    label: "",
                    component: "text"
                }, {
                    label: "About Us",
                    component: "link",
                    url: 'https://www.databridge.ch'
                }, {
                    label: "Open Documentation",
                    component: "button",
                    action: function (arg) {
                        window.open('https://github.com/ChristofSchwarz/db_ext_master-vis-changer/blob/main/README.md', '_blank');
                    }
                }
            ]
        }
    }
});
