# Master Visualization Changer

This Qlik Sense extension, adds a group of checkboxes for each measure within a chart. The user can show/hide the corresponding
measure in the chart by selecting/deselecting the checkboxes. Also, measures can be **grouped** into such with a modifier (for example 
"full accumulation") and such without. That way the user can switch between accumulation and no accumulation.

![screenshot](./pics/demo.gif "screenshot")

## Approach
Since there is no "conditional show" formula available in the
charts (only in tables and pivots), the only way to achieve this is by copying the properties of a master item, manipulate the
measure list, and using the [Visualization API](https://help.qlik.com/en-US/sense-developer/May2021/Subsystems/APIs/Content/Sense_ClientAPIs/CapabilityAPIs/VisualizationAPI/create-method.htm)  to render it.

## Known limitations

* No support of Internet Explorer
* The context menu for Export, Switch to Data View, ... of the chart is not available
 
