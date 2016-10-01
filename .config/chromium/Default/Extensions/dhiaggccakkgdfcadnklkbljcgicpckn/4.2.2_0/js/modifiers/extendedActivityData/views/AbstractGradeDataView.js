var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AbstractGradeDataView = (function (_super) {
    __extends(AbstractGradeDataView, _super);
    function AbstractGradeDataView(gradeData, units) {
        _super.call(this, units);
        this.mainColor = [0, 128, 0];
        this.setGraphTitleFromUnits();
        this.gradeData = gradeData;
        this.setupDistributionGraph(this.gradeData.gradeZones);
        this.setupDistributionTable(this.gradeData.gradeZones);
        this.speedUnitsData = Helper.getSpeedUnitData();
    }
    AbstractGradeDataView.prototype.render = function () {
        this.content += this.generateSectionTitle('<img src="' + this.appResources.areaChartIcon + '" style="vertical-align: baseline; height:20px;"/> GRADE <a target="_blank" href="' + this.appResources.settingsLink + '#/zonesSettings/grade" style="float: right;margin-right: 10px;"><img src="' + this.appResources.cogIcon + '" style="vertical-align: baseline; height:20px;"/></a>');
        this.makeGrid(3, 6);
        this.insertDataIntoGrid();
        this.generateCanvasForGraph();
        this.injectToContent();
    };
    AbstractGradeDataView.prototype.insertDataIntoGrid = function () {
        this.insertContentAtGridPosition(0, 0, this.gradeData.gradeProfile, 'Grade Profile', '', 'displayAdvancedGradeData');
        this.insertContentAtGridPosition(0, 1, this.gradeData.lowerQuartileGrade, '25% Quartile Grade', '%', 'displayAdvancedGradeData');
        this.insertContentAtGridPosition(1, 1, this.gradeData.medianGrade, '50% Quartile Grade', '%', 'displayAdvancedGradeData');
        this.insertContentAtGridPosition(2, 1, this.gradeData.upperQuartileGrade, '75% Quartile Grade', '%', 'displayAdvancedGradeData');
        this.insertContentAtGridPosition(0, 2, (this.gradeData.upFlatDownInSeconds.up / this.gradeData.upFlatDownInSeconds.total * 100).toFixed(1), '% climbing', '%', 'displayAdvancedGradeData');
        this.insertContentAtGridPosition(1, 2, (this.gradeData.upFlatDownInSeconds.flat / this.gradeData.upFlatDownInSeconds.total * 100).toFixed(1), '% flat', '%', 'displayAdvancedGradeData');
        this.insertContentAtGridPosition(2, 2, (this.gradeData.upFlatDownInSeconds.down / this.gradeData.upFlatDownInSeconds.total * 100).toFixed(1), '% downhill ', '%', 'displayAdvancedGradeData');
        this.insertContentAtGridPosition(0, 3, Helper.secondsToHHMMSS(this.gradeData.upFlatDownInSeconds.up), 'Climbing time', '', 'displayAdvancedGradeData');
        this.insertContentAtGridPosition(1, 3, Helper.secondsToHHMMSS(this.gradeData.upFlatDownInSeconds.flat), 'Flat time', '', 'displayAdvancedGradeData');
        this.insertContentAtGridPosition(2, 3, Helper.secondsToHHMMSS(this.gradeData.upFlatDownInSeconds.down), 'Downhill time', '', 'displayAdvancedGradeData');
        var distanceUp = this.gradeData.upFlatDownDistanceData.up * this.speedUnitsData.speedUnitFactor;
        var distanceFlat = this.gradeData.upFlatDownDistanceData.flat * this.speedUnitsData.speedUnitFactor;
        var distanceDown = this.gradeData.upFlatDownDistanceData.down * this.speedUnitsData.speedUnitFactor;
        this.insertContentAtGridPosition(0, 5, ((distanceUp !== 0) ? distanceUp.toFixed(1) : '-'), 'Climbing distance', this.speedUnitsData.units, 'displayAdvancedGradeData');
        this.insertContentAtGridPosition(1, 5, ((distanceFlat !== 0) ? distanceFlat.toFixed(1) : '-'), 'Flat distance', this.speedUnitsData.units, 'displayAdvancedGradeData');
        this.insertContentAtGridPosition(2, 5, ((distanceDown !== 0) ? distanceDown.toFixed(1) : '-'), 'Downhill distance', this.speedUnitsData.units, 'displayAdvancedGradeData');
    };
    return AbstractGradeDataView;
}(AbstractDataView));
