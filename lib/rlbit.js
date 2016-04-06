'use strict'

// segment:    { s: ?, l: ?}
// rlBitList:  List of segments sorted by start (s)
// rlBitImage: 

// A segment is a dictionary with a start, length, and optional value
// If no value is given, all segments are assumed to have the same value (undefined)
// { s: 0, l: 10 }
// start: inclusive
// end: exclusive
// e.g. [start, end)

var rl = {};

rl.mkSegment = function(start, end) {
    if (start === undefined || end === undefined) {
        return undefined;
    }

    var length = end - start;

    if (length <= 0) {
        return undefined;
    }

    return {s: start, l: length};
}

// If segment2 starts in the middle of segment1, then it can be merged into segment1
rl.mergeLeft = function( segment1, segment2 ) {
    var segment1End = segment1.s + segment1.l;
    var segment2End = segment2.s + segment2.l;
    if ( segment1.s <= segment2.s && segment2.s <= (segment1End)) {
        var end = Math.max(segment1End, segment2End);
        var len = end - segment1.s;
        return { s: segment1.s, l: len };
    }
};

// Comparison function to maintain sortedness invariant
rl.compare = function( segment1, segment2 ) {
    if (segment1.s < segment2.s) {
        return -1;
    } else if (segment1.s == segment2.s) {
        return 0;
    } else {
        return 1;
    }
};

// runs1 : sorted list of runs
// runs2 : sorted list of runs
// returns : sorted list of runs1 and runs2 concatenated
rl.concatSorted = function(runs1, runs2) {
    var idx1 = 0;
    var idx2 = 0;
    var r = [];

    while (idx1 < runs1.length && idx2 < runs2.length) {
        if (rl.compare(runs1[idx1], runs2[idx2]) < 0) {
            r.push(runs1[idx1++]);
        } else {
            r.push(runs2[idx2++]);
        }
    }

    while (idx1 < runs1.length) {
        r.push(runs1[idx1++]);
    }

    while (idx2 < runs2.length) {
        r.push(runs2[idx2++]);
    }

    return r;
};

// Simplify by merging segments with overlapping areas
// segments: sorted list of segments
rl.simplify = function(segments) {
    if (segments.length <= 1) {
        return segments;
    }

    // Output list of merged segments
    var merged = [];
    // segments which we're currently attempting to merge into
    var currentlyMerging = segments[0];

    for (var i=1; i < segments.length; i++) {
        var r = segments[i];
        var potentialMerge = rl.mergeLeft(currentlyMerging, r);

        if (potentialMerge === undefined) {
            // Failed to merge
            // Record current merge as complete, and start next attempt
            merged.push(currentlyMerging);
            currentlyMerging = r;

        } else {
            // Merge successful
            // Update current merge
            currentlyMerging = potentialMerge;
        }
    }

    // Record final merge attempt
    merged.push(currentlyMerging);

    return merged;
};

// TODO: Rewrite this to run in a single pass
rl.union = function(runs1, runs2) {
    var runs = rl.concatSorted(runs1, runs2);
    return rl.simplify(runs);
};

rl.intersect = function(shape1, shape2) {
    var idx1 = 0;
    var idx2 = 0;
    var r = [];

    while (idx1 < shape1.length && idx2 < shape2.length) {
        var r1 = shape1[idx1];
        var r2 = shape2[idx2];
    }
};

// Invariants: shape must be sorted + simplified
rl.invert = function(shape, iend) {
    var r = [];

    // Where to start the next inverted segment
    var istart = 0;

    for (var i in shape) {
        var segment = shape[i];

        // If istart == segment.s there's no point in adding a segment here
        // Using a stronger < constraint rather than == because why not?
        if (istart < segment.s) {
            r.push({s: istart, l: segment.s - istart});
        }

        // Start the next inverted segment at the end of this one
        istart = segment.s + segment.l;
    }

    if (iend && istart < iend) {
        r.push({s:istart, l: iend - istart});
    }

    return r;
}

// seg1 - seg2
// returns list of segments
// 2 results: seg2 used up
// 1 result: seg1 used up
rl.subtractSegment = function(seg1, seg2) {
    var r = [];
    if (seg1.s < seg2.s) {
        var segment = rl.mkSegment(seg1.s, seg2.s);
        if (segment) { r.push(segment) };
    }
};

// return: shape1 - shape2
rl.subtract = function(shape1, shape2) {
    var idx1 = 0;
    var idx2 = 0;
    var r = [];

    var prevR2End = 0;

    while (idx1 < shape1.length && idx2 < shape2.length) {
        var r1 = shape1[idx1];
        var r2 = shape2[idx2];

        if (rl.compare(r1, r2) < 0) {
            // Start either at the beginning of r1 or the end of previous r2
            // Whichever comes later
            // r1      -----------------------
            // pr2 ------    r2 ------
            //           ^ start      ^ start
            //                  ^ end         ^ end
            var start = Math.max(r1.s, prevR2End);
            var r1end = r1.s + r1.l;

            // Either end where r1 ends or where r2 starts
            if (r1end < r2.s) {
                // Ends at the end of r1
                // done with r1 go to next segment in shape1
                var segment = rl.mkSegment(start, r1end);
                // r.push({s: start, l: r1end - start});
                if (segment) {r.push(segment)};
                idx1++;

            } else {
                // Ends at start of r2
                // Done with r2 go to next segment in shape2
                var segment = rl.mkSegment(start, r2.s);
                // r.push({s: start, l: r2.s - start});
                if (segment) {r.push(segment)};
                prevR2End = r2.s + r2.l;
                idx2++;
            }

        } else {
            prevR2End = r2.s + r2.l;
            idx2++;
        }
    }

    // Remaining segments with nothing to subtract
    while (idx1 < shape1.length) {
        r.push(shape1[idx1++]);
    }

    return r;
};

// Determine the minimum number of changes to go from shape 1 -> shape 2
// returns:
//  { old:   segments to reset to background color
//  , new:   segments to introduce }
rl.diff = function(shape1, shape2) {
    return {
        old: rl.subtract(shape1, shape2),
        new: rl.subtract(shape2, shape1)
    };
};

// Verify that a list of segments is well formed (for debugging)
// The following checks are performed:
//   1) The start locations are non negative
//   2) It is well ordered (sorted by start location)
//   3) The lengths are all non-negative and non-zero
//   4) The segments are not overlapping
rl.verify = function(segments) {
    var errors = [];

    var prevStart = -1;
    var prevEnd = -1;
    for (i in segments) {
        var current = segments[i];
        if (current.s < 0) {
            errors.push({
                message: "Start location is negative",
                segment: current
            });
        }

        // Check order
        if (prevStart > current.s) {
            errors.push({
                message: "Segment is out of order: should occur earlier in list",
                segment: current
            });
        }
        // Check valid length
        if (current.l <= 0) {
            errors.push({
                message: "Segment length is invalid: <= 0",
                segment: current
            });
        }
        // Check overlapping
        if (prevEnd >= current.s) {
            errors.push({
                message: "Segment is overlapping previous segment",
                segment: current
            });
        }

        // Check integral
        // Not strictly necessary but makes a huge performance difference when
        // rendering to a canvas
        if (Math.round(current.s) !== current.s
                || Math.round(current.l) !== current.l) {
            errors.push({
                message: "Non-integral value found",
                segment: current
            });
        }

        prevStart = current.s;
        prevEnd   = current.s + current.l;
    }

    return errors;
};

// run length encoding in an image
// Images have a width+height
// TODO: Handle case where outside image
var rlImage = function(imgWidth, imgHeight) {

    var obj = {};

    // Make a segment on an image row
    // Truncates segments at image boundaries
    // As a result segments created by this function cannot wrap around
    obj.mkSegment = function(row, startCol, endCol) {
        // Truncate at image edges
        if (row < 0 || row >= imgHeight) {
            return undefined;
        }

        // Truncate at image edges
        startCol = Math.max(startCol, 0);
        startCol = Math.min(startCol, imgHeight); // TODO: imgHeight-1?
        endCol = Math.max(endCol, 0);
        endCol = Math.min(endCol, imgWidth);

        if (startCol == endCol) { return undefined }

        // Compute absolute index into image
        var absolute = row * imgWidth;

        return {s: absolute + startCol, l: endCol - startCol};
    }

    obj.mkSquare = function(x,y,w,h) {
        var r = [];
        for (var row = y; row < y + h; row++) {
            var segment = this.mkSegment(row, x, x+w);
            if (segment) { r.push(segment); }
        }
        return r;
    };

    // Circle of radius r centered around point (x,y)
    obj.mkCircle = function(x, y, r) {
        var ret = [];
        for (var i = -r + 1; i < r; i++) {
            var row = y + i;

            // Get the circle shape by computing the length of the chord
            // along each image row. Round it here for a more symmetrical circle
            var halfChord = Math.sqrt(Math.pow(r, 2) - Math.pow(i, 2));
            var circleOffset = Math.round(r - halfChord);

            // Start and end locations for this row
            var startCol = x - r + circleOffset;
            var endCol   = x + r - circleOffset;

            var segment = this.mkSegment(row, startCol, endCol);
            if (segment) { ret.push(segment); }
        }
        return ret;
    };

    // Line with rounded end caps
    // To use for drawing strokes
    obj.mkLine = function(x1, y1, x2, y2, w) {
        var endCap1 = obj.mkCircle(x1, y1, w);
        var endCap2 = obj.mkCircle(x2, y2, w);
        // var endCap1 = [];
        // var endCap2 = [];

        // Draw the connecting line
        var rise = y2 - y1;
        var run = x2 - x1;
        var lineLength = Math.sqrt(Math.pow(rise, 2) + Math.pow(run, 2));
        var rowLength = (lineLength/Math.abs(run)) * w * 2;

        var line = [];
        for (var ry = 0; ry < Math.abs(rise); ry++) {
            var row = y1 + ry;
            var col = x1 - w + ry * (run / rise);
            var start = row * imgWidth + col;
            line.push({s: start, l: rowLength});
        }

        return rl.union(rl.union(endCap1, endCap2), line);
        // return rl.union(endCap1, endCap2);
    };

    obj.mkDiamond = function(x, y, r) {
        var ret = [];
        for (var i = -r; i < r; i++) {
            var row = y + i;
            var start = row * imgWidth + x - i;
            ret.push({s: start, l: Math.abs(i * 2)});
        }
        return ret;
    };

    // Translate an object
    obj.translate = function(subject, shiftx, shifty) {
        var r = [];
        for (var i in subject) {
            var oldSegment = subject[i];
            var oldRow = Math.floor(oldSegment.s / imgWidth);
            var oldCol = oldSegment.s % imgWidth;
            var newSegment = this.mkSegment(
                    oldRow + shifty,
                    oldCol + shiftx,
                    oldCol + shiftx + oldSegment.l);
            if (newSegment) { r.push(newSegment) };
        }

        return r;
    };

    obj.stupidLine = function(x1, y1, x2, y2, w) {
        var rise = y2 - y1;
        var run = x2 - x1;

        var yStart = Math.min(y1, y2);
        var yEnd = Math.max(y1, y2);

        var circlesPerRow = Math.round(Math.abs(run/rise));

        var circles = [];

        for (var row = yStart; row < yEnd; row++) {
            var x = (row - yStart) * (run / rise) + x1;
            circles = rl.union(circles, this.mkCircle(Math.round(x), row, w));
        }

        return circles;
    };

    obj.simpleLine = function(x1, y1, x2, y2) {
        var r = [];

        var w = 10;

        var rise = y2 - y1;
        var run = x2 - x1;
        // var slope = (y2 - y1) / (x2 - x1);

        // The length of the entire line we're drawing: (x1,y1) to (x2, y2)
        var lineLength = Math.sqrt(Math.pow(rise, 2) + Math.pow(run, 2));

        // Compute number of rows
        var extraRows = (Math.abs(run)/lineLength) * w;
        var totalRows = Math.abs(rise) + extraRows;

        // The length of each segment to achieve the desired thickness
        if (Math.abs(rise) <= 1) {
            var segmentLength = w;
        } else {
            var segmentLength = (lineLength / Math.abs(rise)) * w;
        }
        console.log(segmentLength);

        var yStart = Math.min(y1, y2);
        var yEnd = Math.max(y1, y2);

        // Iterate through rows in order
        // Order is important to maintain sortedness invariant
        for (var rr=0; rr < totalRows; rr++) {
            var row = rr + yStart;
            var x = (row - yStart) * (run / rise) + x2;
            var segment = this.mkSegment(row, x-(segmentLength/2), x+(segmentLength/2));
            if (segment) { r.push(segment) };
        }

        return r;
    };

    //    x2,y2
    //       =====
    //      /    /
    //     /  w /
    //     =====
    // x1,y2
    obj.mkParallelogram = function(x1, y1, x2, y2, w) {
        // y = mx+b
        // x = (y-b)/m
        var rise = y2 - y1;
        var run = x2 - x1;

        // Pythagorean theorem to get length of 
        var lineLength = Math.sqrt(Math.pow(rise, 2) + Math.pow(run, 2));
        var rowLength = (lineLength/Math.abs(run)) * w * 2;

        var line = [];
        for (var ry = 0; ry < Math.abs(rise); ry++) {
            var row = y1 + ry;
            var col = x1 - w + ry * (run / rise);
            var start = row * imgWidth + col;
            line.push({s: start, l: rowLength});
        }
    };

    obj.invert = function(s) {
        return rl.invert(s, imgWidth * imgHeight);
    };

    obj.toCanvas = function(imgData, runs) {
        // var canvas = $("<canvas>")[0];
        // var ctx = canvas.getContext("2d");
        // var imgData = ctx.createImageData(imgWidth, imgHeight);

        for (var r in runs) {
            for (var i = 0; i < r.l; i++) {
                var pix = (r.s + i) * 4;
                imgData.data[pix+0] = 255;
                imgData.data[pix+1] = 0;
                imgData.data[pix+2] = 0;
                imgData.data[pix+3] = 255;
            }
        }

        return imgData;
    };

    return obj;
};

rl.each = function(runs, func) {
    var runid = 0;
    for (var a in runs) {
        var r = runs[a];
        for (var i = r.s; i < r.s+r.l; i++) {
            func(i, runid++);
        }
    }
}

// Aliases
rl.or = rl.union;
rl.and = rl.intersect;
rl.not = rl.invert;
rl.difference = rl.subtract;
// rl.xor
