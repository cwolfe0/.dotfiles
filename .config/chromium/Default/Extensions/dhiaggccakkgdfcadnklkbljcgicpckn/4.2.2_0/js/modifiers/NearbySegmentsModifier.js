var NearbySegmentsModifier = (function () {
    function NearbySegmentsModifier(jsonSegments, appResources) {
        this.segments = jsonSegments;
        this.appResources = appResources;
    }
    NearbySegmentsModifier.prototype.modify = function () {
        var html = "<div class='dropdown' style='padding-bottom: 10px;'>";
        html += "<div class='drop-down-menu' style='width: 100%;' >";
        html += "<button class='btn btn-default dropdown-toggle'><img style='vertical-align:middle' src='" + this.appResources.trackChangesIcon + "'/> <span>Nearby Cycling+Running Segments</span> <span class='app-icon-wrapper '><span class='app-icon icon-strong-caret-down icon-dark icon-xs'></span></span></button>";
        html += "<ul class='options' style='max-height: 800px; z-index: 999;'>";
        var segment;
        var segmentName;
        var segmentIconType;
        _.each(this.segments, function (segment) {
            segmentName = segment.name + " <i>@ " + (segment.distance / 1000).toFixed(1) + "k, " + segment.avg_grade.toFixed(1) + "%";
            if (segment.climb_category > 0) {
                segmentName += ", Cat. " + segment.climb_category_desc;
            }
            segmentName += '</i>';
            if (segment.type === 'cycling') {
                segmentIconType = "<span class='app-icon icon-ride icon-sm type' style='margin-right: 7px;'/>";
            }
            else if (segment.type === 'running') {
                segmentIconType = "<span class='app-icon icon-run icon-sm type' style='margin-right: 7px;'/>";
            }
            else {
                segmentIconType = "";
            }
            html += "<li style='max-width: 600px;'><a href='/segments/" + segment.id + "'>" + segmentIconType + segmentName + "</a></li>";
        });
        html += "</ul>";
        html += "</div>";
        html += "</div>";
        $(html).prependTo('.segment-activity-my-efforts');
    };
    return NearbySegmentsModifier;
}());
